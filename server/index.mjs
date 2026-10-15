import { createServer } from 'node:http';
import { createReadStream, readFileSync } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const port = Number(process.env.API_PORT || process.env.PORT || 3001);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set in the server environment.');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    ca: readFileSync(path.join(rootDir, 'server', 'certs', 'supabase-root-ca-2021.crt')),
    rejectUnauthorized: true,
  },
  max: 5,
});

const schema = `
  CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    creator_session_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    session_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_messages_group_id ON public.messages(group_id);
  CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_active_sessions_group_id ON public.active_sessions(group_id);
  CREATE INDEX IF NOT EXISTS idx_active_sessions_last_seen ON public.active_sessions(last_seen);
  CREATE INDEX IF NOT EXISTS idx_groups_location ON public.groups(latitude, longitude);
`;

const json = (response, status, body) => {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(body));
};

const readJson = async (request) => {
  if (request.body !== undefined) {
    const body = request.body;
    const rawBody = typeof body === 'string' || Buffer.isBuffer(body)
      ? body
      : JSON.stringify(body);

    if (Buffer.byteLength(rawBody) > 16_384) {
      const error = new Error('Request body is too large.');
      error.status = 413;
      throw error;
    }

    try {
      return typeof body === 'string' || Buffer.isBuffer(body)
        ? JSON.parse(rawBody.toString())
        : body;
    } catch {
      const error = new Error('Request body must be valid JSON.');
      error.status = 400;
      throw error;
    }
  }

  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 16_384) {
      const error = new Error('Request body is too large.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.status = 400;
    throw error;
  }
};

const requireUuid = (value, fieldName) => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    const error = new Error(`${fieldName} must be a valid UUID.`);
    error.status = 400;
    throw error;
  }
  return value;
};

const safeDatabaseMessage = (error) => {
  switch (error.code) {
    case '23503':
      return 'The selected group or session no longer exists.';
    case '23505':
      return 'This session already exists. Please refresh and try again.';
    case '23502':
      return 'Some required information is missing.';
    case '42501':
      return 'The database denied this operation. Check the database role permissions.';
    case '42P01':
      return 'The chat database schema is missing. Restart the server to initialize it.';
    default:
      return 'The database request failed. Check the server logs and database connection.';
  }
};

const transaction = async (work) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteIfEmpty = async (client, groupId) => {
  if (!groupId) return;
  await client.query(
    `DELETE FROM public.groups g
     WHERE g.id = $1
       AND NOT EXISTS (
         SELECT 1 FROM public.active_sessions s WHERE s.group_id = g.id
       )`,
    [groupId],
  );
};

const cleanupInactiveSessions = async () => transaction(async (client) => {
  await client.query(
    `DELETE FROM public.active_sessions
     WHERE last_seen < now() - interval '5 minutes'`,
  );
  await client.query(
    `DELETE FROM public.groups g
     WHERE NOT EXISTS (
       SELECT 1 FROM public.active_sessions s WHERE s.group_id = g.id
     )`,
  );
});

const routes = async (request, response, url) => {
  const { pathname, searchParams } = url;
  const method = request.method;

  if (method === 'GET' && pathname === '/api/health') {
    await pool.query('SELECT 1');
    return json(response, 200, { status: 'ok' });
  }

  if (method === 'GET' && pathname === '/api/groups') {
    const { rows } = await pool.query(
      `SELECT g.*,
              count(s.id)::int AS "activeUsers"
       FROM public.groups g
       LEFT JOIN public.active_sessions s
         ON s.group_id = g.id AND s.last_seen >= now() - interval '5 minutes'
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
    );
    return json(response, 200, rows);
  }

  if (method === 'POST' && pathname === '/api/groups') {
    const body = await readJson(request);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const creatorSessionId = requireUuid(body.creator_session_id, 'creator_session_id');

    if (!name || name.length > 50) {
      return json(response, 400, { error: 'Chat name must be between 1 and 50 characters.' });
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return json(response, 400, { error: 'A valid location is required to create a chat.' });
    }

    const group = await transaction(async (client) => {
      const session = await client.query(
        'SELECT session_id FROM public.active_sessions WHERE session_id = $1 FOR UPDATE',
        [creatorSessionId],
      );
      if (session.rowCount === 0) {
        const error = new Error('Your session expired. Please start a new session.');
        error.status = 401;
        throw error;
      }

      const { rows } = await client.query(
        `INSERT INTO public.groups (name, latitude, longitude, creator_session_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, latitude, longitude, creatorSessionId],
      );
      await client.query(
        `UPDATE public.active_sessions
         SET group_id = $1, last_seen = now()
         WHERE session_id = $2`,
        [rows[0].id, creatorSessionId],
      );
      return rows[0];
    });

    return json(response, 201, group);
  }

  if (method === 'GET' && pathname === '/api/active-users') {
    const groupId = searchParams.get('groupId');
    if (groupId) requireUuid(groupId, 'groupId');
    const { rows } = await pool.query(
      `SELECT count(*)::int AS total_count,
              count(*) FILTER (WHERE group_id = $1)::int AS group_count
       FROM public.active_sessions
       WHERE last_seen >= now() - interval '5 minutes'`,
      [groupId],
    );
    return json(response, 200, {
      totalCount: rows[0].total_count,
      groupCount: rows[0].group_count,
    });
  }

  if (method === 'POST' && pathname === '/api/sessions') {
    const body = await readJson(request);
    const sessionId = requireUuid(body.session_id, 'session_id');
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    if (!username || username.length > 64) {
      return json(response, 400, { error: 'A username between 1 and 64 characters is required.' });
    }

    await pool.query(
      `INSERT INTO public.active_sessions (session_id, username)
       VALUES ($1, $2)
       ON CONFLICT (session_id)
       DO UPDATE SET username = EXCLUDED.username, last_seen = now()`,
      [sessionId, username],
    );
    return json(response, 201, { session_id: sessionId });
  }

  const sessionMatch = pathname.match(/^\/api\/sessions\/([^/]+)(?:\/(heartbeat))?$/);
  if (sessionMatch) {
    const sessionId = requireUuid(sessionMatch[1], 'session_id');
    const isHeartbeat = sessionMatch[2] === 'heartbeat';

    if (method === 'POST' && isHeartbeat) {
      const result = await pool.query(
        'UPDATE public.active_sessions SET last_seen = now() WHERE session_id = $1',
        [sessionId],
      );
      if (!result.rowCount) return json(response, 404, { error: 'Session not found. Please start a new session.' });
      return json(response, 200, { status: 'ok' });
    }

    if (method === 'PATCH' && !isHeartbeat) {
      const body = await readJson(request);
      const groupId = body.group_id === null ? null : requireUuid(body.group_id, 'group_id');
      const updated = await transaction(async (client) => {
        const current = await client.query(
          'SELECT group_id FROM public.active_sessions WHERE session_id = $1 FOR UPDATE',
          [sessionId],
        );
        if (!current.rowCount) {
          const error = new Error('Session not found. Please start a new session.');
          error.status = 404;
          throw error;
        }
        const previousGroupId = current.rows[0].group_id;
        await client.query(
          `UPDATE public.active_sessions SET group_id = $1, last_seen = now()
           WHERE session_id = $2`,
          [groupId, sessionId],
        );
        if (previousGroupId && previousGroupId !== groupId) {
          await deleteIfEmpty(client, previousGroupId);
        }
        return { status: 'ok' };
      });
      return json(response, 200, updated);
    }

    if (method === 'DELETE' && !isHeartbeat) {
      await transaction(async (client) => {
        const result = await client.query(
          'DELETE FROM public.active_sessions WHERE session_id = $1 RETURNING group_id',
          [sessionId],
        );
        if (result.rowCount) await deleteIfEmpty(client, result.rows[0].group_id);
      });
      return json(response, 200, { status: 'ok' });
    }
  }

  const messageMatch = pathname.match(/^\/api\/groups\/([^/]+)\/messages$/);
  if (messageMatch) {
    const groupId = requireUuid(messageMatch[1], 'group_id');

    if (method === 'GET') {
      const { rows } = await pool.query(
        `SELECT * FROM public.messages
         WHERE group_id = $1
         ORDER BY created_at ASC
         LIMIT 100`,
        [groupId],
      );
      return json(response, 200, rows);
    }

    if (method === 'POST') {
      const body = await readJson(request);
      const senderName = typeof body.sender_name === 'string' ? body.sender_name.trim() : '';
      const content = typeof body.content === 'string' ? body.content.trim() : '';
      const sessionId = typeof body.session_id === 'string' ? body.session_id : '';
      if (!senderName || senderName.length > 64 || !content || content.length > 2000 ||
          !sessionId || sessionId.length > 100) {
        return json(response, 400, { error: 'A sender, session, and message of 1-2000 characters are required.' });
      }
      const { rows } = await pool.query(
        `INSERT INTO public.messages (group_id, sender_name, content, session_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [groupId, senderName, content, sessionId],
      );
      return json(response, 201, rows[0]);
    }

    if (method === 'DELETE') {
      const sessionId = searchParams.get('sessionId');
      if (sessionId) {
        await pool.query(
          'DELETE FROM public.messages WHERE group_id = $1 AND session_id = $2',
          [groupId, sessionId],
        );
      } else {
        await pool.query('DELETE FROM public.messages WHERE group_id = $1', [groupId]);
      }
      return json(response, 200, { status: 'ok' });
    }
  }

  return json(response, 404, { error: 'API route not found.' });
};

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

const serveFrontend = async (request, response, url) => {
  const requestedPath = decodeURIComponent(url.pathname);
  const resolvedPath = path.resolve(distDir, `.${requestedPath}`);
  if (resolvedPath !== distDir && !resolvedPath.startsWith(`${distDir}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }

  let filePath = resolvedPath;
  try {
    await access(filePath);
  } catch {
    filePath = path.join(distDir, 'index.html');
  }

  try {
    const fileStat = await stat(filePath);
    response.writeHead(200, {
      'content-type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'content-length': fileStat.size,
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Build the frontend with npm run build before starting the production server.');
  }
};

export const handleRequest = async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      await routes(request, response, url);
    } else if (request.method === 'GET' || request.method === 'HEAD') {
      await serveFrontend(request, response, url);
    } else {
      json(response, 405, { error: 'Method not allowed.' });
    }
  } catch (error) {
    console.error('Request failed:', error);
    const status = Number.isInteger(error.status) ? error.status : 500;
    const message = error.status ? error.message : safeDatabaseMessage(error);
    json(response, status, { error: message });
  }
};

let databaseInitialization;
export const initializeDatabase = () => {
  if (!databaseInitialization) {
    databaseInitialization = pool.query(schema).then(cleanupInactiveSessions);
  }
  return databaseInitialization;
};

if (process.env.VERCEL !== '1') {
  const server = createServer(handleRequest);
  await initializeDatabase();
  server.listen(port, '0.0.0.0', () => {
    console.log(`NearbyChat server listening on port ${port}.`);
  });

  const cleanupTimer = setInterval(() => {
    void cleanupInactiveSessions().catch((error) => {
      console.error('Error cleaning up inactive sessions:', error);
    });
  }, 60_000);
  cleanupTimer.unref();

  const shutdown = async () => {
    clearInterval(cleanupTimer);
    server.close();
    await pool.end();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
