# StudySync Database Setup

Use the Supabase SQL Editor for this file.

## Set Up the Database

Run the full schema on your Supabase project:

```text
database/schema.sql
```

This creates all tables, constraints, and Row Level Security policies. Row Level
Security is enabled without browser policies because the frontend must go through
the Express API, which uses the backend-only secret key.

If you are re-running the schema against a project that already has data, back up
the database first, because the script recreates the tables.

## After the SQL Succeeds

1. Confirm `server/.env` contains the correct Supabase URL and backend secret key.
2. Run `npm install` inside `server/`.
3. Run `npm run create-admin` inside `server/`.
4. Run `npm run dev` inside `server/`.
5. Serve `client/` on port `5500`.

The API health URL is `http://localhost:5000/api/health`.
