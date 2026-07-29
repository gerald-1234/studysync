-- StudySync legacy-to-current schema migration
-- Date: 2026-07-29
--
-- Use this file when the connected Supabase project still has the original
-- subjects, academic_terms, guardian_phone, subject_id, and academic_term_id
-- names. Existing rows and UUID relationships are preserved.
-- The migration is safe to run again after it succeeds.

begin;

-- 1. Update the student profile without losing the existing contact number.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students'
      and column_name = 'guardian_phone'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students'
      and column_name = 'emergency_contact_phone'
  ) then
    alter table public.students
      rename column guardian_phone to emergency_contact_phone;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students'
      and column_name = 'guardian_phone'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students'
      and column_name = 'emergency_contact_phone'
  ) then
    update public.students
    set emergency_contact_phone = coalesce(
      nullif(btrim(emergency_contact_phone), ''),
      guardian_phone
    );

    alter table public.students
      drop column guardian_phone;
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students'
      and column_name = 'emergency_contact_phone'
  ) then
    alter table public.students
      add column emergency_contact_phone varchar(30);
  end if;
end;
$$;

alter table public.students
  add column if not exists faculty varchar(120);

alter table public.students
  add column if not exists department varchar(120);

update public.students
set faculty = 'Not specified'
where faculty is null or btrim(faculty) = '';

update public.students
set emergency_contact_phone = 'Not specified'
where emergency_contact_phone is null or btrim(emergency_contact_phone) = '';

alter table public.students
  alter column faculty set not null,
  alter column emergency_contact_phone set not null;

-- 2. Rename the legacy master tables. Renaming preserves their UUIDs,
-- foreign keys, existing data, RLS state, and grants.
do $$
begin
  if to_regclass('public.subjects') is not null
     and to_regclass('public.courses') is null then
    alter table public.subjects rename to courses;
  elsif to_regclass('public.subjects') is not null
     and to_regclass('public.courses') is not null then
    raise exception 'Both public.subjects and public.courses exist. Merge them manually before running this migration.';
  elsif to_regclass('public.courses') is null then
    raise exception 'Neither public.subjects nor public.courses exists.';
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.academic_terms') is not null
     and to_regclass('public.semesters') is null then
    alter table public.academic_terms rename to semesters;
  elsif to_regclass('public.academic_terms') is not null
     and to_regclass('public.semesters') is not null then
    raise exception 'Both public.academic_terms and public.semesters exist. Merge them manually before running this migration.';
  elsif to_regclass('public.semesters') is null then
    raise exception 'Neither public.academic_terms nor public.semesters exists.';
  end if;
end;
$$;

-- 3. Rename course fields to the final API contract.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses'
      and column_name = 'subject_code'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses'
      and column_name = 'course_code'
  ) then
    alter table public.courses rename column subject_code to course_code;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses'
      and column_name = 'course_title'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'courses'
        and column_name = 'subject_name'
    ) then
      alter table public.courses rename column subject_name to course_title;
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'courses'
        and column_name = 'course_name'
    ) then
      alter table public.courses rename column course_name to course_title;
    else
      alter table public.courses add column course_title varchar(120);
    end if;
  end if;
end;
$$;

update public.courses
set course_title = course_code
where course_title is null or btrim(course_title) = '';

alter table public.courses
  alter column course_code set not null,
  alter column course_title set not null;

-- Remove leftover duplicate legacy columns only when the final columns exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses'
      and column_name = 'subject_name'
  ) then
    execute $sql$
      update public.courses
      set course_title = coalesce(nullif(btrim(course_title), ''), subject_name, course_code)
    $sql$;
    alter table public.courses drop column subject_name;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses'
      and column_name = 'course_name'
  ) then
    execute $sql$
      update public.courses
      set course_title = coalesce(nullif(btrim(course_title), ''), course_name, course_code)
    $sql$;
    alter table public.courses drop column course_name;
  end if;
end;
$$;

-- 4. Rename semester and relationship columns.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'semesters'
      and column_name = 'term_name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'semesters'
      and column_name = 'semester_name'
  ) then
    alter table public.semesters rename column term_name to semester_name;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrolments'
      and column_name = 'subject_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrolments'
      and column_name = 'course_id'
  ) then
    alter table public.enrolments rename column subject_id to course_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrolments'
      and column_name = 'academic_term_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrolments'
      and column_name = 'semester_id'
  ) then
    alter table public.enrolments rename column academic_term_id to semester_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'instructor_assignments'
      and column_name = 'subject_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'instructor_assignments'
      and column_name = 'course_id'
  ) then
    alter table public.instructor_assignments rename column subject_id to course_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'instructor_assignments'
      and column_name = 'academic_term_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'instructor_assignments'
      and column_name = 'semester_id'
  ) then
    alter table public.instructor_assignments rename column academic_term_id to semester_id;
  end if;
end;
$$;

-- 5. Keep human-readable constraint, index, and trigger names aligned with
-- the final schema. The constraints themselves remain valid after renames.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.courses'::regclass
      and conname = 'subjects_subject_code_key'
  ) and not exists (
    select 1 from pg_constraint
    where conrelid = 'public.courses'::regclass
      and conname = 'courses_course_code_key'
  ) then
    alter table public.courses
      rename constraint subjects_subject_code_key to courses_course_code_key;
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.courses'::regclass
      and conname in ('subjects_subject_name_key', 'courses_course_name_key')
  ) and not exists (
    select 1 from pg_constraint
    where conrelid = 'public.courses'::regclass
      and conname = 'courses_course_title_key'
  ) then
    if exists (
      select 1 from pg_constraint
      where conrelid = 'public.courses'::regclass
        and conname = 'subjects_subject_name_key'
    ) then
      alter table public.courses
        rename constraint subjects_subject_name_key to courses_course_title_key;
    else
      alter table public.courses
        rename constraint courses_course_name_key to courses_course_title_key;
    end if;
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.semesters'::regclass
      and conname = 'academic_terms_term_name_academic_session_key'
  ) and not exists (
    select 1 from pg_constraint
    where conrelid = 'public.semesters'::regclass
      and conname = 'semesters_semester_name_academic_session_key'
  ) then
    alter table public.semesters
      rename constraint academic_terms_term_name_academic_session_key
      to semesters_semester_name_academic_session_key;
  end if;
end;
$$;

-- Guarantee unique course titles if a legacy database did not have the rule.
do $$
declare
  title_attnum smallint;
begin
  select attnum into title_attnum
  from pg_attribute
  where attrelid = 'public.courses'::regclass
    and attname = 'course_title'
    and not attisdropped;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.courses'::regclass
      and contype = 'u'
      and conkey = array[title_attnum]::smallint[]
  ) then
    alter table public.courses
      add constraint courses_course_title_key unique (course_title);
  end if;
end;
$$;

drop index if exists public.one_active_assignment_per_subject_term;
drop index if exists public.enrolments_subject_index;
drop index if exists public.enrolments_term_index;
drop index if exists public.assignments_term_index;

create unique index if not exists one_active_assignment_per_course_semester
  on public.instructor_assignments (course_id, semester_id)
  where status = 'active';

create index if not exists enrolments_course_index
  on public.enrolments (course_id);

create index if not exists enrolments_semester_index
  on public.enrolments (semester_id);

create index if not exists assignments_semester_index
  on public.instructor_assignments (semester_id);

-- Recreate the renamed update triggers so their names match the final tables.
drop trigger if exists subjects_set_updated_at on public.courses;
drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists terms_set_updated_at on public.semesters;
drop trigger if exists semesters_set_updated_at on public.semesters;
create trigger semesters_set_updated_at
before update on public.semesters
for each row execute function public.set_updated_at();

alter table public.courses enable row level security;
alter table public.semesters enable row level security;

-- Ask PostgREST to refresh its table and column cache immediately.
notify pgrst, 'reload schema';

commit;
