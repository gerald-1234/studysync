-- StudySync Student Course Registration System
-- Run this file in the Supabase SQL Editor before starting the backend.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) unique not null,
  password_hash varchar(255) not null,
  role varchar(30) not null check (
    role in ('admin', 'registration_officer', 'manager', 'instructor')
  ),
  first_name varchar(80) not null,
  last_name varchar(80) not null,
  is_active boolean not null default true,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  registration_number varchar(30) unique not null,
  first_name varchar(80) not null,
  last_name varchar(80) not null,
  gender varchar(20) not null check (gender in ('Female', 'Male')),
  phone varchar(30) not null,
  email varchar(255),
  faculty varchar(120) not null,
  department varchar(120),
  emergency_contact_phone varchar(30) not null,
  registration_date date not null default current_date,
  status varchar(20) not null default 'active' check (
    status in ('active', 'inactive')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instructors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users(id) on delete set null,
  staff_number varchar(30) unique not null,
  first_name varchar(80) not null,
  last_name varchar(80) not null,
  phone varchar(30) not null,
  email varchar(255) unique not null,
  qualification varchar(160),
  status varchar(20) not null default 'active' check (
    status in ('active', 'inactive')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  course_code varchar(20) unique not null,
  course_title varchar(120) unique not null,
  description text,
  level varchar(50),
  status varchar(20) not null default 'active' check (
    status in ('active', 'inactive')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  semester_name varchar(80) not null,
  academic_session varchar(30) not null,
  start_date date not null,
  end_date date not null,
  status varchar(20) not null default 'open' check (
    status in ('open', 'closed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (semester_name, academic_session),
  check (end_date >= start_date)
);

create table if not exists public.enrolments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  course_id uuid not null references public.courses(id),
  semester_id uuid not null references public.semesters(id),
  enrolled_at timestamptz not null default now(),
  status varchar(20) not null default 'active' check (
    status in ('active', 'cancelled')
  ),
  unique (student_id, course_id, semester_id)
);

create table if not exists public.instructor_assignments (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructors(id),
  course_id uuid not null references public.courses(id),
  semester_id uuid not null references public.semesters(id),
  assigned_at timestamptz not null default now(),
  status varchar(20) not null default 'active' check (
    status in ('active', 'cancelled')
  )
);

create unique index if not exists one_active_assignment_per_course_semester
  on public.instructor_assignments (course_id, semester_id)
  where status = 'active';

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action varchar(100) not null,
  details text,
  created_at timestamptz not null default now()
);

create index if not exists enrolments_student_index on public.enrolments (student_id);
create index if not exists enrolments_course_index on public.enrolments (course_id);
create index if not exists enrolments_semester_index on public.enrolments (semester_id);
create index if not exists assignments_instructor_index on public.instructor_assignments (instructor_id);
create index if not exists assignments_semester_index on public.instructor_assignments (semester_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists instructors_set_updated_at on public.instructors;
create trigger instructors_set_updated_at
before update on public.instructors
for each row execute function public.set_updated_at();

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists semesters_set_updated_at on public.semesters;
create trigger semesters_set_updated_at
before update on public.semesters
for each row execute function public.set_updated_at();

-- The frontend must use the Express API. It must not query these tables directly.
alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.instructors enable row level security;
alter table public.courses enable row level security;
alter table public.semesters enable row level security;
alter table public.enrolments enable row level security;
alter table public.instructor_assignments enable row level security;
alter table public.audit_logs enable row level security;
