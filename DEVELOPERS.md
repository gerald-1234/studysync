# StudySync Developer Guide

## 1. Goal

Build a small web application for a private tutoring centre. The application must let staff:

1. Register students.
2. Add subjects and academic terms.
3. Enrol students in subjects.
4. Add instructors.
5. Assign an instructor to each subject for a term.
6. View simple reports.

Keep the first version simple. Do not start with fees, attendance, results, SMS, or a mobile app.

## 2. Recommended Technology

Use one Node.js project:

- Node.js 20 or newer
- Express
- SQLite with `better-sqlite3`
- HTML, CSS, and vanilla JavaScript
- `express-session` for login sessions
- `bcrypt` for password hashing
- `dotenv` for environment variables

Why this choice:

- SQLite is a single database file, so no separate database server is required during development.
- Express is small and easy to explain during a defence.
- Vanilla JavaScript keeps the frontend understandable.
- Session authentication is simpler than introducing JWT tokens for this project.

Do not introduce microservices, Docker, Redis, message queues, complex state libraries, or multiple databases in the first version.

## 3. Project Setup

Run these commands after Node.js is installed:

```powershell
npm init -y
npm install express better-sqlite3 bcrypt express-session dotenv
npm install --save-dev nodemon
```

Add useful scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon server/server.js",
    "start": "node server/server.js",
    "test": "node --test"
  }
}
```

Create `.env` from this example:

```env
PORT=3000
SESSION_SECRET=replace-this-with-a-long-random-value
DATABASE_PATH=./data/studysync.db
```

Never commit the real `.env` file. Commit an `.env.example` file instead.

## 4. Suggested Folder Structure

```text
StudySync/
  client/
    index.html
    login.html
    students.html
    subjects.html
    enrolments.html
    instructors.html
    assignments.html
    reports.html
    assets/
      css/
        global.css
        dashboard.css
      js/
        api.js
        auth.js
        students.js
        subjects.js
        enrolments.js
        instructors.js
        assignments.js
        reports.js
  server/
    server.js
    db.js
    middleware/
      requireAuth.js
      requireRole.js
    routes/
      authRoutes.js
      studentRoutes.js
      subjectRoutes.js
      termRoutes.js
      instructorRoutes.js
      enrolmentRoutes.js
      assignmentRoutes.js
      reportRoutes.js
    services/
      auditService.js
  data/
    studysync.db
  scripts/
    initDatabase.js
    seedDemoData.js
    generate_studysync_sad_report.py
  test/
    enrolment.test.js
    assignment.test.js
  .env.example
  README.md
  DEVELOPERS.md
```

The exact names can change, but keep one clear responsibility per file. Do not put every route, SQL query, and authentication rule in `server.js`.

## 5. Roles and Permissions

Use these four roles in the initial release:

| Action | Admin | Registration Officer | Centre Manager | Instructor |
| --- | --- | --- | --- | --- |
| Manage user accounts | Yes | No | No | No |
| Register and update students | Yes | Yes | Yes | No |
| Manage subjects and terms | Yes | No | Yes | No |
| Enrol students | Yes | Yes | Yes | No |
| Manage instructors | Yes | No | Yes | No |
| Assign instructors | Yes | No | Yes | No |
| View reports | Yes | Yes | Yes | Own class list only |
| View audit log | Yes | No | No | No |

Important: hide actions in the user interface for roles that should not use them, but always enforce the same restriction in the backend. A hidden button is not security.

## 6. Database Design

Use SQLite foreign keys:

```sql
PRAGMA foreign_keys = ON;
```

Create the following tables.

### 6.1 `user_accounts`

```sql
CREATE TABLE user_accounts (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'registration_officer', 'manager', 'instructor')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 6.2 `students`

```sql
CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  user_account_id INTEGER UNIQUE,
  registration_number TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Female', 'Male', 'Other')),
  phone_number TEXT NOT NULL,
  email_address TEXT,
  guardian_phone TEXT NOT NULL,
  registration_date TEXT NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  FOREIGN KEY (user_account_id) REFERENCES user_accounts(id)
);
```

### 6.3 `instructors`

```sql
CREATE TABLE instructors (
  id INTEGER PRIMARY KEY,
  user_account_id INTEGER UNIQUE,
  staff_number TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email_address TEXT,
  qualification TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  FOREIGN KEY (user_account_id) REFERENCES user_accounts(id)
);
```

### 6.4 `subjects`

```sql
CREATE TABLE subjects (
  id INTEGER PRIMARY KEY,
  subject_code TEXT NOT NULL UNIQUE,
  subject_name TEXT NOT NULL UNIQUE,
  description TEXT,
  level TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);
```

### 6.5 `academic_terms`

```sql
CREATE TABLE academic_terms (
  id INTEGER PRIMARY KEY,
  term_name TEXT NOT NULL,
  academic_session TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  UNIQUE (term_name, academic_session)
);
```

### 6.6 `enrolments`

```sql
CREATE TABLE enrolments (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  academic_term_id INTEGER NOT NULL,
  enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (academic_term_id) REFERENCES academic_terms(id),
  UNIQUE (student_id, subject_id, academic_term_id)
);
```

### 6.7 `instructor_assignments`

```sql
CREATE TABLE instructor_assignments (
  id INTEGER PRIMARY KEY,
  instructor_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  academic_term_id INTEGER NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  FOREIGN KEY (instructor_id) REFERENCES instructors(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (academic_term_id) REFERENCES academic_terms(id)
);

CREATE UNIQUE INDEX one_active_assignment_per_subject_term
ON instructor_assignments (subject_id, academic_term_id)
WHERE status = 'active';
```

### 6.8 `audit_logs`

```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY,
  user_account_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_account_id) REFERENCES user_accounts(id)
);
```

Do not delete enrolments or assignments when staff correct a mistake. Change their status to `cancelled` so the system keeps an audit trail.

## 7. Backend Routes

Use REST-style JSON routes. Keep route handlers short; place repeated checks in middleware or small helper functions.

| Method | Route | Purpose | Minimum Role |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Start a user session. | Public |
| POST | `/api/auth/logout` | End a user session. | Logged-in user |
| GET | `/api/auth/me` | Return current user and role. | Logged-in user |
| GET | `/api/students` | List/search students. | Admin, officer, manager |
| POST | `/api/students` | Create a student. | Admin, officer, manager |
| GET | `/api/students/:id` | View one student. | Admin, officer, manager |
| PATCH | `/api/students/:id` | Update one student. | Admin, officer, manager |
| GET/POST/PATCH | `/api/subjects` | List, create, update subjects. | Manager or admin for changes |
| GET/POST/PATCH | `/api/terms` | List, create, update terms. | Manager or admin for changes |
| GET/POST/PATCH | `/api/instructors` | List, create, update instructors. | Manager or admin for changes |
| GET/POST/PATCH | `/api/enrolments` | View, create, cancel enrolments. | Admin, officer, manager |
| GET/POST/PATCH | `/api/assignments` | View, create, cancel assignments. | Manager or admin for changes |
| GET | `/api/instructor/my-subjects` | Return current instructor's subjects and class lists. | Instructor |
| GET | `/api/reports/subject-enrolment` | Return registration totals by subject. | Admin, officer, manager |
| GET | `/api/reports/instructor-assignments` | Return instructor allocation list. | Admin, officer, manager |

For every protected route:

1. Check that a session exists.
2. Check that the user has an allowed role.
3. Validate request data.
4. Run parameterised SQL only.
5. Log significant write actions.
6. Return JSON with a clear status code and message.

## 8. Required Validation

Validate on both the browser and server. Browser validation improves usability; server validation protects the database.

| Area | Rules |
| --- | --- |
| Login | Username and password are required. |
| Student | Registration number, first name, last name, gender, phone, and guardian phone are required. Registration number must be unique. |
| Subject | Subject code and subject name are required and unique. |
| Term | Start date must not be after end date. |
| Enrolment | Student, subject, and term are required. Student and subject must be active; term must be open. |
| Duplicate Enrolment | Reject the same student, subject, and term combination. |
| Instructor Assignment | Instructor, subject, and term are required. Instructor and subject must be active. Reject a second active assignment for the same subject and term. |

Example backend guard:

```js
if (!studentId || !subjectId || !termId) {
  return res.status(400).json({ message: "Student, subject, and term are required." });
}
```

Use parameter placeholders, never string concatenation:

```js
const student = db
  .prepare("SELECT id FROM students WHERE registration_number = ?")
  .get(registrationNumber);
```

## 9. Frontend Pages

### 9.1 Login

- Username or email field.
- Password field.
- Clear error message when login fails.
- Redirect to the correct dashboard after login.

### 9.2 Dashboard

Show small, useful counts:

- Active students.
- Active subjects.
- Current-term enrolments.
- Current-term instructor assignments.

Do not fill the dashboard with charts in the first version. Four clear totals and shortcuts to common tasks are enough.

### 9.3 Student Management

- Search by registration number, first name, or last name.
- Table of students.
- Add and edit student form.
- Link from a student record to their enrolment history.

### 9.4 Subject Enrolment

- Search/select student.
- Select academic term.
- Display active subjects as checkboxes.
- Save selected subjects.
- Display existing enrolments and allow authorised cancellation.

### 9.5 Instructor Assignment

- Select an instructor.
- Select a subject.
- Select an academic term.
- Save assignment.
- Show the current assignment so staff do not create duplicates.

### 9.6 Instructor Dashboard

- Assigned subjects for the active term.
- Student list for each assigned subject.
- No controls for other instructors, accounts, subjects, or reports.

### 9.7 Reports

- Subject enrolment totals for a term.
- Instructor-to-subject assignment list for a term.
- Student registration list.
- Export to CSV later if needed; do not make PDF export a first-release requirement.

## 10. Implementation Order

Build in this order. Finish and test one stage before moving to the next.

1. Create the Express server, static file serving, SQLite connection, and database initialisation script.
2. Create the first admin account with a hashed password.
3. Build login, logout, session middleware, and role middleware.
4. Build student and subject management.
5. Build academic-term management.
6. Build student enrolment and the duplicate-enrolment rule.
7. Build instructor profiles and instructor assignments.
8. Build the instructor dashboard and basic reports.
9. Add audit logs, backups, and test cases.
10. Add CSS polish and seed data for the project demonstration.

## 11. Minimum Security Checklist

- Hash passwords with `bcrypt`.
- Keep `SESSION_SECRET` in `.env`.
- Set session cookies to `httpOnly`; use `secure: true` when deployed with HTTPS.
- Use parameterised SQL queries.
- Validate every request in the backend.
- Enforce roles in backend middleware.
- Do not expose database files through the `client` folder.
- Do not store real student data in Git or in screenshots used for the defence.
- Back up the SQLite database file daily once the application is deployed.

## 12. Test Checklist

Before the defence, verify these scenarios:

1. Admin can log in and create roles.
2. Registration officer can create a student.
3. Duplicate registration number is rejected.
4. Manager can add a subject and an academic term.
5. Registration officer can enrol a student in several subjects.
6. The same student cannot be enrolled twice in the same subject and term.
7. Manager can assign an instructor to a subject.
8. A second active instructor assignment for that subject and term is rejected.
9. Instructor sees only their own subjects and students.
10. Subject enrolment report totals match the stored enrolments.
11. A cancelled enrolment remains visible in the record history.
12. A database backup can be restored to a separate test file.

## 13. Demonstration Data

Create safe sample data for the defence:

- Academic term: `First Term`, session `2026/2027`.
- Subjects: Mathematics, English Language, Physics, Chemistry.
- Two instructors with distinct subjects.
- Four to six fictional students.
- Enrol each fictional student in two or three subjects.

Use fictional names and phone numbers only.

## 14. Defence Talking Points

Keep the technical explanation direct:

- **Why SQLite?** It is simple for a small centre and easy to deploy for the prototype. The schema can later move to MySQL or PostgreSQL without changing the system design.
- **Why separate enrolments and assignments?** A student selecting a subject and a manager allocating a tutor are different business activities and must be tracked separately.
- **How are duplicates prevented?** The backend validates the request, and the database has a unique constraint on student, subject, and term.
- **How is data protected?** Login sessions, hashed passwords, role checks, parameterised SQL, audit logs, and backups.
- **Why not include fees and attendance now?** Limiting the first version keeps the system reliable, testable, and easy for staff to learn. The database is ready for those modules later.

## 15. Report Generation

The file `scripts/generate_studysync_sad_report.py` creates the SAD report:

```powershell
python scripts\generate_studysync_sad_report.py
```

It writes the report to:

```text
C:\Users\hp\Documents\StudySync_SAD_Report.docx
```

Replace the placeholder student name and registration number on the Word title page before submission.
