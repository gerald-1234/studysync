const supabase = require("../config/supabase");
const { throwIfSupabaseError } = require("../utils/helpers");

async function courseEnrolmentReport(request, response) {
  let query = supabase
    .from("enrolments")
    .select("course_id, courses(course_code, course_title), semesters(id, semester_name, academic_session)")
    .eq("status", "active");

  if (request.query.semesterId) {
    query = query.eq("semester_id", request.query.semesterId);
  }

  const { data, error } = await query;
  throwIfSupabaseError(error);

  const groups = new Map();
  for (const enrolment of data) {
    const key = `${enrolment.semesters.id}:${enrolment.course_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        semester: `${enrolment.semesters.semester_name} ${enrolment.semesters.academic_session}`,
        courseCode: enrolment.courses.course_code,
        courseTitle: enrolment.courses.course_title,
        enrolmentCount: 0,
      });
    }
    groups.get(key).enrolmentCount += 1;
  }

  const report = [...groups.values()].sort((left, right) =>
    left.courseTitle.localeCompare(right.courseTitle),
  );
  return response.json({ report });
}

async function instructorAssignmentReport(request, response) {
  let query = supabase
    .from("instructor_assignments")
    .select(`
      id, status,
      instructors(staff_number, first_name, last_name),
      courses(course_code, course_title),
      semesters(semester_name, academic_session)
    `)
    .eq("status", "active")
    .order("assigned_at", { ascending: false });

  if (request.query.semesterId) {
    query = query.eq("semester_id", request.query.semesterId);
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
  courseEnrolmentReport,
};
