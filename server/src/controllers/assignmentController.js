const supabase = require("../config/supabase");
const { writeAuditLog } = require("../utils/audit");
const {
  createHttpError,
  requiredId,
  throwIfSupabaseError,
} = require("../utils/helpers");

async function listAssignments(request, response) {
  let query = supabase
    .from("instructor_assignments")
    .select(`
      id, status, assigned_at,
      instructors(id, staff_number, first_name, last_name),
      courses(id, course_code, course_title),
      semesters(id, semester_name, academic_session)
    `)
    .order("assigned_at", { ascending: false });

  if (request.query.semesterId) {
    query = query.eq("semester_id", request.query.semesterId);
  }

  const { data, error } = await query;
  throwIfSupabaseError(error);
  return response.json({ assignments: data });
}

async function createAssignment(request, response) {
  const instructorId = requiredId(request.body.instructorId, "Instructor");
  const courseId = requiredId(request.body.courseId, "Course");
  const semesterId = requiredId(request.body.semesterId, "Semester");

  const [{ data: instructor, error: instructorError }, { data: course, error: courseError }, { data: semester, error: semesterError }] =
    await Promise.all([
      supabase.from("instructors").select("id, status").eq("id", instructorId).maybeSingle(),
      supabase.from("courses").select("id, status").eq("id", courseId).maybeSingle(),
      supabase.from("semesters").select("id, status").eq("id", semesterId).maybeSingle(),
    ]);

  throwIfSupabaseError(instructorError);
  throwIfSupabaseError(courseError);
  throwIfSupabaseError(semesterError);

  if (!instructor || instructor.status !== "active") {
    throw createHttpError("Select an active instructor.");
  }
  if (!course || course.status !== "active") {
    throw createHttpError("Select an active course.");
  }
  if (!semester || semester.status !== "open") {
    throw createHttpError("Select an open semester.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("instructor_assignments")
    .select("*")
    .eq("course_id", courseId)
    .eq("semester_id", semesterId)
    .eq("status", "active")
    .maybeSingle();
  throwIfSupabaseError(existingError);

  if (existing && existing.instructor_id !== instructorId) {
    throw createHttpError(
      "This course already has an active instructor assignment for the selected semester.",
      409,
    );
  }
  if (existing) {
    return response.json({ assignment: existing, message: "This instructor is already assigned." });
  }

  const { data, error } = await supabase
    .from("instructor_assignments")
    .insert({
      instructor_id: instructorId,
      course_id: courseId,
      semester_id: semesterId,
      status: "active",
    })
    .select()
    .single();
  throwIfSupabaseError(error);

  await writeAuditLog(request.user.id, "CREATE_ASSIGNMENT", `Created instructor assignment ${data.id}.`);
  return response.status(201).json({ assignment: data });
}

async function cancelAssignment(request, response) {
  const { data, error } = await supabase
    .from("instructor_assignments")
    .update({ status: "cancelled" })
    .eq("id", request.params.id)
    .select()
    .maybeSingle();
  throwIfSupabaseError(error);
  if (!data) {
    throw createHttpError("Instructor assignment was not found.", 404);
  }
  await writeAuditLog(request.user.id, "CANCEL_ASSIGNMENT", `Cancelled instructor assignment ${data.id}.`);
  return response.json({ assignment: data });
}

module.exports = {
  cancelAssignment,
  createAssignment,
  listAssignments,
};
