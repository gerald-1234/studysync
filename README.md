# StudySync

StudySync is a beginner-friendly Student Course Registration System for a university tutorial centre. It manages student records, course enrolment, semesters, instructors, and instructor-to-course assignments.

## Architecture

| Part | Technology | Deployment |
| --- | --- | --- |
| Frontend | Separate HTML pages, CSS, vanilla JavaScript | Cloudflare Pages |
| Backend | Node.js, Express, JWT authentication | Render |
| Database | PostgreSQL through Supabase | Supabase |

The frontend never receives the Supabase secret key. Every database request passes through the Express API.

## User Roles

| Role | Core Responsibility |
| --- | --- |
| Administrator | Creates accounts, assigns roles, and deactivates accounts. |
| Registration Officer | Registers students and enrols them in courses. |
| Tutorial Centre Manager | Manages courses, semesters, instructors, assignments, and reports. |
| Instructor | Views assigned courses and class lists. |

## Core Features

- Secure email and password login.
- Role-based page routing and API permissions.
- Student registration and profile updates.
- Course and academic-semester management.
- Student enrolment in one or more courses.
- Duplicate-enrolment prevention.
- Instructor login account and teaching profile created together.
- One active instructor assignment per course and semester.
- Course enrolment and instructor-assignment reports.
- Instructor class lists.
- Audit logging for important changes.

Fees, attendance, results, timetables, SMS, online lessons, and parent portals are intentionally outside the first version.

## Repository Structure

```text
StudySync/
  client/
    admin/
    registration/
    manager/
    instructor/
    assets/
    index.html
    404.html
  database/
    schema.sql
    README.md
  server/
    src/
      config/
      controllers/
      middleware/
      routes/
      scripts/
      utils/
    test/
    .env.example
    package.json
    server.js
  render.yaml
  wrangler.toml
  README.md
  DEVELOPERS.md
  LICENSE
```

Each role has real HTML pages in its own folder. JavaScript handles API calls and fills existing tables and form controls; it does not generate the page structure.

## Local Setup

### 1. Create the Supabase database

1. Create or open the Supabase project.
2. Open the Supabase SQL Editor.
3. Run [`database/schema.sql`](database/schema.sql).
4. Copy the project URL and backend secret key.

Row Level Security is enabled without browser policies because the frontend must use the Express API.

### 2. Configure the server

From the project root:

```powershell
Copy-Item server\.env.example server\.env
```

Fill in `server/.env`:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5500,http://127.0.0.1:5500
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-supabase-secret-key
JWT_SECRET=replace-this-with-at-least-32-random-characters
JWT_EXPIRES_IN=8h
ADMIN_FIRST_NAME=System
ADMIN_LAST_NAME=Administrator
ADMIN_EMAIL=admin@studysync.local
ADMIN_PASSWORD=ChangeMe123
```

Never place `SUPABASE_SECRET_KEY` in `client/`.

### 3. Install and start the API

```powershell
Set-Location server
npm install
npm run create-admin
npm run dev
```

The API runs at `http://localhost:5000`. Its health endpoint is:

```text
http://localhost:5000/api/health
```

### 4. Start the frontend

From another terminal in the project root:

```powershell
python -m http.server 5500 --directory client
```

Open:

```text
http://localhost:5500
```

## Recommended Demo Order

1. Sign in as the administrator and create registration officer, manager, and instructor accounts. Creating an instructor also creates the linked teaching profile.
2. Sign in as the manager and create a semester and courses.
3. Sign in as the registration officer and register students.
4. Enrol the students in courses.
5. Sign in as the manager and assign instructors.
6. Open the reports page.
7. Sign in as an instructor and show the class list.

## Deployment

### Render backend

1. Push the project to GitHub.
2. Create a Render Blueprint from the repository.
3. Render reads [`render.yaml`](render.yaml).
4. Add `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `CLIENT_URL`.
5. Confirm that `/api/health` returns a successful response.

The expected production API address is:

```text
https://studysync-api-z0vp.onrender.com/api
```

If Render gives the service a different address, update:

- `client/assets/js/config.js`
- `client/_headers`

### Cloudflare Pages frontend

The repository includes [`wrangler.toml`](wrangler.toml), which deploys the `client/` folder to Cloudflare Pages.

1. From the repository root, run:

   ```bash
   npx wrangler pages deploy client
   ```

   Alternatively, connect the repository in the Cloudflare dashboard and set the output directory to `client`.
2. Copy the Cloudflare Pages URL into Render's `CLIENT_URL`.

## Verification

Backend:

```powershell
Set-Location server
npm test
```

The current test suite checks input validation and role permission behaviour.

The UI has also been checked with Playwright at desktop and mobile sizes for:

- Administrator login and account management.
- Registration officer student management.
- Manager assignments and reports.
- Instructor course and class-list view.

## Documentation

- [`DEVELOPERS.md`](DEVELOPERS.md) contains the detailed implementation.
