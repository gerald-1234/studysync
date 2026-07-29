const supabase = require("../config/supabase");
const { createHttpError, throwIfSupabaseError } = require("../utils/helpers");

async function getCurrentSemester() {
  const { data, error } = await supabase
    .from("semesters")
    .select("id, semester_name, academic_session, status")
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
  const currentSemester = await getCurrentSemester();
  const [activeStudents, activeCourses, activeInstructors, currentEnrolments, currentAssignments] =
    await Promise.all([
      countRows("students", (query) => query.eq("status", "active")),
      countRows("courses", (query) => query.eq("status", "active")),
      countRows("instructors", (query) => query.eq("status", "active")),
      currentSemester
        ? countRows("enrolments", (query) => query.eq("semester_id", currentSemester.id).eq("status", "active"))
        : 0,
      currentSemester
        ? countRows("instructor_assignments", (query) =>
          query.eq("semester_id", currentSemester.id).eq("status", "active"))
        : 0,
    ]);

  return response.json({
    currentSemester,
    counts: {
      activeStudents,
      activeCourses,
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

  const currentSemester = await getCurrentSemester();
  let query = supabase
    .from("instructor_assignments")
    .select("id, course_id, semester_id, courses(course_code, course_title), semesters(semester_name, academic_session)")
    .eq("instructor_id", instructor.id)
    .eq("status", "active");
  if (currentSemester) {
    query = query.eq("semester_id", currentSemester.id);
  }

  const { data: assignments, error: assignmentError } = await query;
  throwIfSupabaseError(assignmentError);

  let classSize = 0;
  for (const assignment of assignments) {
    classSize += await countRows(
      "enrolments",
      (enrolmentQuery) =>
        enrolmentQuery
          .eq("course_id", assignment.course_id)
          .eq("semester_id", assignment.semester_id)
          .eq("status", "active"),
    );
  }

  return response.json({
    currentSemester,
    instructor,
    counts: {
      assignedCourses: assignments.length,
      enrolledStudents: classSize,
    },
    assignments,
  });
}

module.exports = { instructorDashboard, staffDashboard };
