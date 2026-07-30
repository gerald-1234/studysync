-- Limit StudySync student gender values to Female or Male.
-- Run this in the Supabase SQL Editor for an already-created database.

begin;

do $$
declare
  gender_constraint record;
begin
  if exists (
    select 1
    from public.students
    where gender not in ('Female', 'Male')
  ) then
    raise exception
      'Some students have unsupported gender values. Update those rows to Female or Male before running this migration.';
  end if;

  for gender_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.students'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%gender%'
  loop
    execute format(
      'alter table public.students drop constraint %I',
      gender_constraint.conname
    );
  end loop;

  alter table public.students
    add constraint students_gender_check
    check (gender in ('Female', 'Male'));
end;
$$;

notify pgrst, 'reload schema';

commit;
