# StudySync

StudySync is a proposed Student Course Registration System for a small private tutoring centre. It replaces paper-based registration with one simple web application for storing student records, registering students for subjects, and tracking the instructors assigned to teach those subjects.

The accompanying Software Analysis and Design report is generated as:

`C:\Users\hp\Documents\StudySync_SAD_Report.docx`

## Project Purpose

The system solves common problems in a manual tutoring-centre workflow:

- Student records are hard to find and can be duplicated.
- Subject selections are recorded in different books or spreadsheets.
- Instructor assignments are not easy to confirm.
- Management must count enrolments manually before planning classes.

StudySync stores this information in one database so staff can search records, register subjects correctly, assign instructors, and create simple reports.

## Core Features

- Secure login with role-based access.
- Student registration and profile updates.
- Subject creation and status management.
- Academic-term setup.
- Student subject enrolment.
- Duplicate-enrolment prevention.
- Instructor profile management.
- Instructor-to-subject assignment for a term.
- Instructor dashboard with assigned subjects and student lists.
- Reports for students, subject enrolment, and instructor assignments.

## User Roles

| Role | Main Responsibilities |
| --- | --- |
| System Administrator | Creates user accounts, assigns roles, resets passwords, manages backups. |
| Registration Officer | Registers students, updates profiles, and enrols students in subjects. |
| Centre Manager | Manages subjects and terms, assigns instructors, and views reports. |
| Instructor | Views assigned subjects and the students enrolled in them. |
| Student | Optionally views their registered subjects in a later self-service version. |

## Scope

The first version focuses only on student registration, subject enrolment, instructor assignment, and reporting.

It does **not** include fees, attendance, examination results, timetable generation, online lessons, parent messaging, payroll, or SMS. These are future enhancements after the core workflow is stable.

## Recommended Beginner-Friendly Stack

- **Frontend:** HTML, CSS, and vanilla JavaScript.
- **Backend:** Node.js with Express.
- **Database:** SQLite during development, because it is simple and requires no separate database server.
- **Authentication:** Express sessions and `bcrypt` password hashing.

This stack is small enough for a school project while still demonstrating a real client-server application and relational database.

## Key Data Records

| Record | Purpose |
| --- | --- |
| User Account | Login credentials and user role. |
| Student | Learner profile and contact details. |
| Instructor | Tutor profile and contact details. |
| Subject | A subject offered by the centre, such as Mathematics. |
| Academic Term | The term or session for registrations and assignments. |
| Enrolment | A student's selection of one subject in one term. |
| Instructor Assignment | The instructor responsible for one subject in one term. |

## Main Rules

- A student must have a unique registration number.
- A student can take many subjects.
- A student cannot be enrolled in the same subject twice in the same term.
- Only active subjects can be selected during registration.
- Only active instructors can be assigned to teach a subject.
- One subject has one active instructor assignment per term in the first version.
- Instructors can view only their own assigned subjects and student lists.

## Expected Pages

1. Login
2. Role dashboard
3. Student list and student registration form
4. Subject management
5. Academic-term management
6. Student subject enrolment
7. Instructor management
8. Instructor assignment
9. Instructor dashboard
10. Reports

## Documentation

- [DEVELOPERS.md](DEVELOPERS.md) contains the recommended folder structure, database schema, routes, build order, security rules, and testing checklist.
- `scripts/generate_studysync_sad_report.py` generates the Word report in the Documents folder.

## Project Status

This repository currently contains the system specification and implementation guide. The website should be built by following the stages in `DEVELOPERS.md`.
