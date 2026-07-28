const supabase = require("../config/supabase");
const { throwIfSupabaseError } = require("../utils/helpers");

async function subjectEnrolmentReport(request, response) {
  let query = supabase
    .from("enrolments")
    .select("subject_id, subjects(subject_code, subject_name), academic_terms(id, term_name, academic_session)")
    .eq("status", "active");

  if (request.query.termId) {
    query = query.eq("academic_term_id", request.query.termId);
  }

  const { data, error } = await query;
  throwIfSupabaseError(error);

  const groups = new Map();
  for (const enrolment of data) {
    const key = `${enrolment.academic_terms.id}:${enrolment.subject_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        term: `${enrolment.academic_terms.term_name} ${enrolment.academic_terms.academic_session}`,
        subjectCode: enrolment.subjects.subject_code,
        subjectName: enrolment.subjects.subject_name,
        enrolmentCount: 0,
      });
    }
    groups.get(key).enrolmentCount += 1;
  }

  const report = [...groups.values()].sort((left, right) =>
    left.subjectName.localeCompare(right.subjectName),
  );
  return response.json({ report });
}

async function instructorAssignmentReport(request, response) {
  let query = supabase
    .from("instructor_assignments")
    .select(`
      id, status,
      instructors(staff_number, first_name, last_name),
      subjects(subject_code, subject_name),
      academic_terms(term_name, academic_session)
    `)
    .eq("status", "active")
    .order("assigned_at", { ascending: false });

  if (request.query.termId) {
    query = query.eq("academic_term_id", request.query.termId);
  }

  const { data, error } = await query;
  throwIfSupabaseError(error);
  return response.json({ report: data });
}

async function auditLogReport(_request, response) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, details, created_at, users(first_name, last_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);
  throwIfSupabaseError(error);
  return response.json({ auditLogs: data });
}

module.exports = {
  auditLogReport,
  instructorAssignmentReport,
  subjectEnrolmentReport,
};
