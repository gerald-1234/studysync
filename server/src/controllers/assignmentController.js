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
      subjects(id, subject_code, subject_name),
      academic_terms(id, term_name, academic_session)
    `)
    .order("assigned_at", { ascending: false });

  if (request.query.termId) {
    query = query.eq("academic_term_id", request.query.termId);
  }

  const { data, error } = await query;
  throwIfSupabaseError(error);
  return response.json({ assignments: data });
}

async function createAssignment(request, response) {
  const instructorId = requiredId(request.body.instructorId, "Instructor");
  const subjectId = requiredId(request.body.subjectId, "Subject");
  const termId = requiredId(request.body.termId, "Academic term");

  const [{ data: instructor, error: instructorError }, { data: subject, error: subjectError }, { data: term, error: termError }] =
    await Promise.all([
      supabase.from("instructors").select("id, status").eq("id", instructorId).maybeSingle(),
      supabase.from("subjects").select("id, status").eq("id", subjectId).maybeSingle(),
      supabase.from("academic_terms").select("id, status").eq("id", termId).maybeSingle(),
    ]);

  throwIfSupabaseError(instructorError);
  throwIfSupabaseError(subjectError);
  throwIfSupabaseError(termError);

  if (!instructor || instructor.status !== "active") {
    throw createHttpError("Select an active instructor.");
  }
  if (!subject || subject.status !== "active") {
    throw createHttpError("Select an active subject.");
  }
  if (!term || term.status !== "open") {
    throw createHttpError("Select an open academic term.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("instructor_assignments")
    .select("*")
    .eq("subject_id", subjectId)
    .eq("academic_term_id", termId)
    .eq("status", "active")
    .maybeSingle();
  throwIfSupabaseError(existingError);

  if (existing && existing.instructor_id !== instructorId) {
    throw createHttpError(
      "This subject already has an active instructor assignment for the selected term.",
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
      subject_id: subjectId,
      academic_term_id: termId,
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
