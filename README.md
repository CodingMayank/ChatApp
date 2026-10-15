# NearbyChat

NearbyChat is a React/Vite client with a small Node.js API server. PostgreSQL credentials are read only by the server from `DATABASE_URL`; never put a database URL or password in a `VITE_*` variable or browser code.

## Run locally

1. Install dependencies with `npm install`.
2. Set `DATABASE_URL` in the root `.env` file (which is ignored by Git). Node loads this file for the API server when you run either server script:

   ```dotenv
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/postgres
   ```

   Or set it in the PowerShell session that will run the app. This prompt avoids putting the value in shell history:

   ```powershell
   $secure = Read-Host "DATABASE_URL" -AsSecureString
   $env:DATABASE_URL = [System.Net.NetworkCredential]::new("", $secure).Password
   ```

   Keep the value out of source files and `VITE_*` variables. If the database password contains reserved URL characters such as `@`, URL-encode them in the password (for example, `@` becomes `%40`).
3. Start both the API and Vite client:

   ```powershell
   npm run dev
   ```

   The app is served at `http://localhost:8080`.    The API initializes the chat tables and indexes on startup and removes expired sessions and empty chats periodically.

For a production-style run, build the client with `npm run build`, then start the API and static web server with `npm start`. The hosting environment must provide `DATABASE_URL` as a server-side secret and allow a TLS connection to the Supabase PostgreSQL pooler.

The client polls the API for group, message, and active-user changes. The database connection URL is never bundled into the frontend.
