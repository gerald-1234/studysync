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
      subjects(id, subject_code, subject_name),
      academic_terms(id, term_name, academic_session)
    `)
    .order("enrolled_at", { ascending: false });

  if (request.query.studentId) {
    query = query.eq("student_id", request.query.studentId);
  }
  if (request.query.termId) {
    query = query.eq("academic_term_id", request.query.termId);
  }

  const { data, error } = await query.limit(300);
  throwIfSupabaseError(error);
  return response.json({ enrolments: data });
}

async function createEnrolments(request, response) {
  const studentId = requiredId(request.body.studentId, "Student");
  const termId = requiredId(request.body.termId, "Academic term");
  const subjectIds = [...new Set(request.body.subjectIds || [])].filter(Boolean);

  if (!subjectIds.length) {
    throw createHttpError("Select at least one subject.");
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

  const { data: term, error: termError } = await supabase
    .from("academic_terms")
    .select("id, status")
    .eq("id", termId)
    .maybeSingle();
  throwIfSupabaseError(termError);
  if (!term || term.status !== "open") {
    throw createHttpError("Select an open academic term.");
  }

  const { data: subjects, error: subjectError } = await supabase
    .from("subjects")
    .select("id")
    .in("id", subjectIds)
    .eq("status", "active");
  throwIfSupabaseError(subjectError);
  if (subjects.length !== subjectIds.length) {
    throw createHttpError("All selected subjects must be active.");
  }

  const rows = subjectIds.map((subjectId) => ({
    student_id: studentId,
    subject_id: subjectId,
    academic_term_id: termId,
    status: "active",
    enrolled_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from("enrolments")
    .upsert(rows, { onConflict: "student_id,subject_id,academic_term_id" })
    .select();
  throwIfSupabaseError(error);

  await writeAuditLog(
    request.user.id,
    "CREATE_ENROLMENT",
    `Registered student ${studentId} for ${data.length} subject(s) in term ${termId}.`,
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
