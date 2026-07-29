# StudySync

StudySync is a beginner-friendly Student Course Registration System for a university tutorial centre. It manages student records, course enrolment, semesters, instructors, and instructor-to-course assignments.

The implementation is intentionally limited to the core workflow required by the Software Analysis and Design report, making it practical to explain and defend as a student project.

## Architecture

| Part | Technology | Deployment |
| --- | --- | --- |
| Frontend | Separate HTML pages, CSS, vanilla JavaScript | Vercel |
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
- Instructor profile and login-account linking.
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
    upgrade_legacy_schema.sql
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
  vercel.json
  README.md
  DEVELOPERS.md
```

Each role has real HTML pages in its own folder. JavaScript handles API calls and fills existing tables and form controls; it does not generate the page structure.

## Local Setup

### 1. Create the Supabase database

1. Create or open the Supabase project.
2. Open the Supabase SQL Editor.
3. For a fresh empty project, run [`database/schema.sql`](database/schema.sql).
4. For the existing legacy project with `subjects` and `academic_terms`, run [`database/upgrade_legacy_schema.sql`](database/upgrade_legacy_schema.sql) instead.
5. Copy the project URL and backend secret key.

Row Level Security is enabled without browser policies because the frontend must use the Express API. The legacy migration preserves existing UUIDs, enrolments, assignments, student contact numbers, courses, and semesters while renaming them to the final code contract.

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

1. Sign in as the administrator and create registration officer, manager, and instructor accounts.
2. Sign in as the manager and create a semester and courses.
3. Create an instructor profile and link the instructor account.
4. Sign in as the registration officer and register students.
5. Enrol the students in courses.
6. Sign in as the manager and assign instructors.
7. Open the reports page.
8. Sign in as an instructor and show the class list.

Use fictional student information during the defence.

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
- `vercel.json`

### Vercel frontend

1. Import the same GitHub repository into Vercel.
2. Keep the repository root as the project root.
3. Vercel reads [`vercel.json`](vercel.json) and publishes `client/`.
4. Copy the Vercel URL into Render's `CLIENT_URL`.

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

- [`DEVELOPERS.md`](DEVELOPERS.md) contains the detailed implementation and defence guide.
- `C:\Users\hp\Documents\StudySync_SAD_Report.docx` contains the SAD report.
- [`scripts/generate_studysync_sad_report.py`](scripts/generate_studysync_sad_report.py) regenerates the report.
