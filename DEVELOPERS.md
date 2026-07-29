# StudySync Developer Guide

## 1. Development Goal

StudySync should remain a small, understandable system. Its first version performs four connected activities:

1. Create student records.
2. Register students for subjects in an academic term.
3. Assign instructors to subjects.
4. Produce simple reports and instructor class lists.

Do not add fees, results, attendance, timetables, SMS, or parent portals until the core system is complete and tested.

## 2. Final Technology Stack

- **Client:** HTML, CSS, and vanilla JavaScript.
- **Server:** Node.js 20+, Express, CommonJS modules.
- **Database:** Supabase PostgreSQL.
- **Database access:** `@supabase/supabase-js` using a backend-only secret key.
- **Authentication:** JWT bearer tokens and `bcryptjs` password hashing.
- **Frontend hosting:** Vercel.
- **Backend hosting:** Render.

This stack is straightforward to defend:

- HTML documents make every page visible in the repository.
- Express routes show where each request is handled.
- PostgreSQL tables match the report's ERD.
- Render, Supabase, and Vercel each have one clear responsibility.

## 3. Application Flow

```text
Browser on Vercel
      |
      | HTTPS + JWT
      v
Express API on Render
      |
      | Supabase secret key
      v
PostgreSQL database on Supabase
```

The browser must not query Supabase directly. Row Level Security is enabled without frontend policies, so only the backend secret client can access application tables.

## 4. Folder Responsibilities

### `client/`

Static pages deployed to Vercel.

```text
client/
  admin/
    dashboard.html
    users.html
  registration/
    dashboard.html
    students.html
    enrolments.html
  manager/
    dashboard.html
    subjects.html
    terms.html
    instructors.html
    assignments.html
    reports.html
  instructor/
    dashboard.html
  assets/
    css/global.css
    images/studysync-logo.svg
    js/
      api.js
      auth.js
      config.js
      login.js
      ui.js
      pages/
```

Every page has its own HTML document. Page scripts only:

- Call API routes.
- Fill tables, select controls, and checkboxes.
- Submit forms.
- Display status messages.
- Enforce role routing in the browser.

Backend middleware still performs the real permission check.

### `server/`

Express API deployed to Render.

```text
server/
  server.js
  src/
    app.js
    config/supabase.js
    controllers/
    middleware/
    routes/
    scripts/createAdmin.js
    utils/
  test/
  .env.example
  package.json
```

- **Routes** define URLs and allowed roles.
- **Controllers** validate input and perform business operations.
- **Middleware** checks JWTs and roles.
- **Config** creates the backend-only Supabase client.
- **Utilities** provide reusable validation and audit helpers.

### `database/`

- `schema.sql` is the complete schema for the Supabase SQL Editor.
- `migrations/202607290001_initial_schema.sql` is the standalone initial migration.

## 5. Environment Variables

Create `server/.env` from `server/.env.example`.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` locally and `production` on Render. |
| `PORT` | Local server port; defaults to `5000`. |
| `CLIENT_URL` | Comma-separated frontend origins allowed by CORS. |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_SECRET_KEY` | Backend-only Supabase secret key. |
| `JWT_SECRET` | Secret used to sign login tokens; minimum 32 characters. |
| `JWT_EXPIRES_IN` | Token lifetime, normally `8h`. |
| `ADMIN_FIRST_NAME` | Initial administrator first name. |
| `ADMIN_LAST_NAME` | Initial administrator last name. |
| `ADMIN_EMAIL` | Initial administrator email. |
| `ADMIN_PASSWORD` | Initial administrator password. |

Never commit `server/.env`.

## 6. Database Tables

| Table | Purpose |
| --- | --- |
| `users` | Login account, hashed password, role, lock status. |
| `students` | Student identity and contact details. |
| `instructors` | Instructor profile linked optionally to a user account. |
| `subjects` | Subject code, name, level, and status. |
| `academic_terms` | Term name, session, dates, and open/closed status. |
| `enrolments` | Student-subject selection for a term. |
| `instructor_assignments` | Instructor-subject allocation for a term. |
| `audit_logs` | Important user activity. |

Important constraints:

- Student registration number is unique.
- Subject code and name are unique.
- A term name is unique within an academic session.
- A student-subject-term combination is unique.
- A subject has only one active instructor assignment per term.

Cancelled enrolments and assignments are retained by status instead of being deleted.

## 7. Role Permissions

| Operation | Admin | Registration Officer | Manager | Instructor |
| --- | --- | --- | --- | --- |
| Manage login accounts | Yes | No | No | No |
| Manage students | API permission | Yes | API permission | No |
| Enrol students | API permission | Yes | API permission | No |
| Manage subjects and terms | API permission | No | Yes | No |
| Manage instructor profiles | API permission | No | Yes | No |
| Assign instructors | API permission | No | Yes | No |
| View management reports | API permission | No | Yes | No |
| View own class list | No | No | No | Yes |

The current HTML interface separates responsibilities clearly: administrators handle accounts, registration officers handle students, managers handle academic setup and reports, and instructors view classes.

## 8. API Routes

### Authentication

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Verify credentials and return a JWT. |
| GET | `/api/auth/me` | Return the current active user. |
| POST | `/api/auth/logout` | Add a logout audit entry. |

### Core records

| Method | Route | Purpose |
| --- | --- | --- |
| GET/POST | `/api/users` | List or create login accounts. |
| PATCH | `/api/users/:id/status` | Activate or deactivate an account. |
| GET/POST | `/api/students` | List or create students. |
| GET/PATCH | `/api/students/:id` | View or update a student. |
| GET/POST | `/api/subjects` | List or create subjects. |
| PATCH | `/api/subjects/:id` | Update a subject. |
| GET/POST | `/api/terms` | List or create academic terms. |
| PATCH | `/api/terms/:id` | Update an academic term. |
| GET/POST | `/api/instructors` | List or create instructor profiles. |
| PATCH | `/api/instructors/:id` | Update an instructor profile. |

### Registration and allocation

| Method | Route | Purpose |
| --- | --- | --- |
| GET/POST | `/api/enrolments` | List or create subject enrolments. |
| PATCH | `/api/enrolments/:id/cancel` | Cancel an enrolment. |
| GET/POST | `/api/assignments` | List or create instructor assignments. |
| PATCH | `/api/assignments/:id/cancel` | Cancel an assignment. |

### Dashboards and reports

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/dashboard/staff` | Registration and management totals. |
| GET | `/api/dashboard/instructor` | Current instructor totals. |
| GET | `/api/instructors/me/subjects` | Instructor subjects and class lists. |
| GET | `/api/reports/subject-enrolments` | Subject enrolment totals. |
| GET | `/api/reports/instructor-assignments` | Instructor allocation report. |
| GET | `/api/reports/audit-logs` | Latest audit entries for administrators. |

## 9. Authentication Design

1. User enters email and password.
2. Backend finds the account in `users`.
3. `bcryptjs` compares the password with `password_hash`.
4. Backend signs an eight-hour JWT containing user ID and role.
5. Browser stores the token in `sessionStorage`.
6. `api.js` sends the token in the `Authorization` header.
7. `authMiddleware.js` verifies the token.
8. `roleMiddleware.js` checks the required role.

Five failed login attempts lock the account temporarily for fifteen minutes.

## 10. Core Business Rules

### Student enrolment

Before saving:

- Student must be active.
- Academic term must be open.
- Every selected subject must be active.
- At least one subject must be selected.

The database unique constraint prevents duplicate student-subject-term records. Re-saving a previously cancelled combination reactivates the existing record through `upsert`.

### Instructor assignment

Before saving:

- Instructor must be active.
- Subject must be active.
- Academic term must be open.
- No different active instructor may already be assigned to that subject and term.

The database partial unique index provides a second protection layer.

## 11. Local Development

### Database

Run `database/schema.sql` in Supabase SQL Editor.

### Server

```powershell
Copy-Item server\.env.example server\.env
Set-Location server
npm install
npm run create-admin
npm run dev
```

### Client

```powershell
python -m http.server 5500 --directory client
```

Open `http://localhost:5500`.

## 12. Deployment

### Render

The root `render.yaml` sets:

- Service name: `studysync-api`
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`

Set these Render secrets:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `CLIENT_URL`

Render generates `JWT_SECRET`.

### Vercel

The root `vercel.json` publishes `client/` and applies security headers.

The expected API URL is configured in:

```text
client/assets/js/config.js
```

If the Render URL changes, also update the `connect-src` entries in:

```text
client/_headers
vercel.json
```

## 13. Testing

Backend:

```powershell
Set-Location server
npm test
```

Current automated tests cover:

- Required text validation.
- Email normalisation.
- Password length validation.
- Role middleware denial.

The browser verification covers login and core pages for all four roles at desktop and mobile sizes.

Integration testing against Supabase requires valid values in `server/.env`.

## 14. Defence Explanation

Use these short explanations:

- **Why separate HTML pages?** They make each role and workflow visible and easy to trace without a frontend framework.
- **Why Supabase?** It provides a hosted PostgreSQL database while preserving the relational schema in the report.
- **Why is Supabase not called from the frontend?** The secret key must remain private, and the Express API enforces business rules and roles.
- **Why JWT?** The frontend and backend are deployed on different services, so bearer tokens keep authentication simple.
- **How are duplicate enrolments prevented?** The controller validates data and PostgreSQL has a unique student-subject-term constraint.
- **How is double instructor assignment prevented?** The controller checks existing assignments and PostgreSQL has a partial unique index.
- **Why retain cancelled records?** Status changes preserve history and support auditability.
- **Why exclude fees and results?** The first version stays focused, testable, and easy for centre staff to learn.

## 15. Safe Demo Data

- Term: `First Term`, session `2026/2027`.
- Subjects: Mathematics, English Language, Physics, Chemistry.
- Four to six fictional students.
- Two fictional instructors.
- Two or three subject enrolments per student.

Do not use real student passwords, phone numbers, or personal data in the repository or defence screenshots.
