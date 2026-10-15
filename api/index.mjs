import { handleRequest, initializeDatabase } from '../server/index.mjs';

export default async function handler(request, response) {
  try {
    await initializeDatabase();

    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const routedPath = requestUrl.searchParams.get('route');
    if (routedPath) {
      requestUrl.searchParams.delete('route');
      request.url = `/api/${routedPath.replace(/^\/+/, '')}${requestUrl.search}`;
    }

    await handleRequest(request, response);
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    response.writeHead(500, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(JSON.stringify({
      error: 'The chat database is unavailable. Check the DATABASE_URL setting in Vercel.',
    }));
  }
}
