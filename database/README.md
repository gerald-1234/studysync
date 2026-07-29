# StudySync Database Setup

Use the Supabase SQL Editor for these files.

## Existing Connected Project

The current project still uses the legacy names `subjects`, `academic_terms`, `guardian_phone`, `subject_id`, and `academic_term_id`.

Run this file once:

```text
database/upgrade_legacy_schema.sql
```

It preserves existing rows and changes the schema to:

- `subjects` -> `courses`
- `subject_code` -> `course_code`
- `subject_name` -> `course_title`
- `academic_terms` -> `semesters`
- `term_name` -> `semester_name`
- `guardian_phone` -> `emergency_contact_phone`
- `subject_id` -> `course_id`
- `academic_term_id` -> `semester_id`
- Adds required `faculty` and optional `department` student fields

The migration was tested against the original schema with sample enrolment and instructor-assignment records. It can be run again safely after a successful first run.

## Fresh Supabase Project

For a completely empty project, run:

```text
database/schema.sql
```

Do not run the legacy upgrade first on an empty project.

## After the SQL Succeeds

1. Confirm `server/.env` contains the correct Supabase URL and backend secret key.
2. Run `npm install` inside `server/`.
3. Run `npm run create-admin` inside `server/`.
4. Run `npm run dev` inside `server/`.
5. Serve `client/` on port `5500`.

The API health URL is `http://localhost:5000/api/health`.
