const supabase = require("../config/supabase");
const { createHttpError, throwIfSupabaseError } = require("../utils/helpers");

async function getCurrentTerm() {
  const { data, error } = await supabase
    .from("academic_terms")
    .select("id, term_name, academic_session, status")
    .eq("status", "open")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfSupabaseError(error);
  return data;
}

async function countRows(tableName, filter) {
  let query = supabase.from(tableName).select("id", { count: "exact", head: true });
  if (filter) {
    query = filter(query);
  }
  const { count, error } = await query;
  throwIfSupabaseError(error);
  return count || 0;
}

async function staffDashboard(_request, response) {
  const currentTerm = await getCurrentTerm();
  const [activeStudents, activeSubjects, activeInstructors, currentEnrolments, currentAssignments] =
    await Promise.all([
      countRows("students", (query) => query.eq("status", "active")),
      countRows("subjects", (query) => query.eq("status", "active")),
      countRows("instructors", (query) => query.eq("status", "active")),
      currentTerm
        ? countRows("enrolments", (query) => query.eq("academic_term_id", currentTerm.id).eq("status", "active"))
        : 0,
      currentTerm
        ? countRows("instructor_assignments", (query) =>
          query.eq("academic_term_id", currentTerm.id).eq("status", "active"))
        : 0,
    ]);

  return response.json({
    currentTerm,
    counts: {
      activeStudents,
      activeSubjects,
      activeInstructors,
      currentEnrolments,
      currentAssignments,
    },
  });
}

async function instructorDashboard(request, response) {
  const { data: instructor, error: instructorError } = await supabase
    .from("instructors")
    .select("id, first_name, last_name")
    .eq("user_id", request.user.id)
    .eq("status", "active")
    .maybeSingle();
  throwIfSupabaseError(instructorError);
  if (!instructor) {
    throw createHttpError("No active instructor profile is linked to this account.", 404);
  }

  const currentTerm = await getCurrentTerm();
  let query = supabase
    .from("instructor_assignments")
    .select("id, subject_id, academic_term_id, subjects(subject_code, subject_name), academic_terms(term_name, academic_session)")
    .eq("instructor_id", instructor.id)
    .eq("status", "active");
  if (currentTerm) {
    query = query.eq("academic_term_id", currentTerm.id);
  }

  const { data: assignments, error: assignmentError } = await query;
  throwIfSupabaseError(assignmentError);

  let classSize = 0;
  for (const assignment of assignments) {
    classSize += await countRows(
      "enrolments",
      (enrolmentQuery) =>
        enrolmentQuery
          .eq("subject_id", assignment.subject_id)
          .eq("academic_term_id", assignment.academic_term_id)
          .eq("status", "active"),
    );
  }

  return response.json({
    currentTerm,
    instructor,
    counts: {
      assignedSubjects: assignments.length,
      enrolledStudents: classSize,
    },
    assignments,
  });
}

module.exports = { instructorDashboard, staffDashboard };
