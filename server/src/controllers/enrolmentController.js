const supabase = require("../config/supabase");
const { writeAuditLog } = require("../utils/audit");
const {
  createHttpError,
  requiredId,
  throwIfSupabaseError,
} = require("../utils/helpers");

async function listEnrolments(request, response) {
  let query = supabase
    .from("enrolments")
    .select(`
      id, status, enrolled_at,
      students(id, registration_number, first_name, last_name),
      courses(id, course_code, course_title),
      semesters(id, semester_name, academic_session)
    `)
    .order("enrolled_at", { ascending: false });

  if (request.query.studentId) {
    query = query.eq("student_id", request.query.studentId);
  }
  if (request.query.semesterId) {
    query = query.eq("semester_id", request.query.semesterId);
  }

  const { data, error } = await query.limit(300);
  throwIfSupabaseError(error);
  return response.json({ enrolments: data });
}

async function createEnrolments(request, response) {
  const studentId = requiredId(request.body.studentId, "Student");
  const semesterId = requiredId(request.body.semesterId, "Semester");

  if (!Array.isArray(request.body.courseIds)) {
    throw createHttpError("courseIds must be an array of course IDs.");
  }
  const courseIds = [...new Set(request.body.courseIds)].filter(Boolean);

  if (!courseIds.length) {
    throw createHttpError("Select at least one course.");
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, status")
    .eq("id", studentId)
    .maybeSingle();
  throwIfSupabaseError(studentError);
  if (!student || student.status !== "active") {
    throw createHttpError("Select an active student.");
  }

  const { data: semester, error: semesterError } = await supabase
    .from("semesters")
    .select("id, status")
    .eq("id", semesterId)
    .maybeSingle();
  throwIfSupabaseError(semesterError);
  if (!semester || semester.status !== "open") {
    throw createHttpError("Select an open semester.");
  }

  const { data: courses, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .in("id", courseIds)
    .eq("status", "active");
  throwIfSupabaseError(courseError);
  if (courses.length !== courseIds.length) {
    throw createHttpError("All selected courses must be active.");
  }

  const rows = courseIds.map((courseId) => ({
    student_id: studentId,
    course_id: courseId,
    semester_id: semesterId,
    status: "active",
    enrolled_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from("enrolments")
    .upsert(rows, { onConflict: "student_id,course_id,semester_id" })
    .select();
  throwIfSupabaseError(error);

  await writeAuditLog(
    request.user.id,
    "CREATE_ENROLMENT",
    `Registered student ${studentId} for ${data.length} course(s) in semester ${semesterId}.`,
  );
  return response.status(201).json({ enrolments: data });
}

async function cancelEnrolment(request, response) {
  const { data, error } = await supabase
    .from("enrolments")
    .update({ status: "cancelled" })
    .eq("id", request.params.id)
    .select()
    .maybeSingle();
  throwIfSupabaseError(error);
  if (!data) {
    throw createHttpError("Enrolment was not found.", 404);
  }
  await writeAuditLog(request.user.id, "CANCEL_ENROLMENT", `Cancelled enrolment ${data.id}.`);
  return response.json({ enrolment: data });
}

module.exports = { cancelEnrolment, createEnrolments, listEnrolments };
