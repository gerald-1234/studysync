const supabase = require("../config/supabase");
const { writeAuditLog } = require("../utils/audit");
const {
  createHttpError,
  optionalText,
  requiredText,
  throwIfSupabaseError,
  validEmail,
} = require("../utils/helpers");

function instructorPayload(body) {
  return {
    user_id: body.userId || null,
    staff_number: requiredText(body.staffNumber, "Staff number").toUpperCase(),
    first_name: requiredText(body.firstName, "First name"),
    last_name: requiredText(body.lastName, "Last name"),
    phone: requiredText(body.phone, "Phone number"),
    email: validEmail(body.email),
    qualification: optionalText(body.qualification),
    status: body.status === "inactive" ? "inactive" : "active",
  };
}

async function listInstructors(request, response) {
  let query = supabase
    .from("instructors")
    .select("*")
    .order("last_name")
    .order("first_name");

  if (request.query.activeOnly === "true") {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;
  throwIfSupabaseError(error);
  return response.json({ instructors: data });
}

async function createInstructor(request, response) {
  const payload = instructorPayload(request.body);

  if (payload.user_id) {
    const { data: account, error: accountError } = await supabase
      .from("users")
      .select("id, role, is_active")
      .eq("id", payload.user_id)
      .maybeSingle();
    throwIfSupabaseError(accountError);
    if (!account || account.role !== "instructor" || !account.is_active) {
      throw createHttpError("Select an active user account with the instructor role.");
    }
  }

  const { data, error } = await supabase
    .from("instructors")
    .insert(payload)
    .select()
    .single();
  throwIfSupabaseError(error);
  await writeAuditLog(request.user.id, "CREATE_INSTRUCTOR", `Created instructor ${data.staff_number}.`);
  return response.status(201).json({ instructor: data });
}

async function updateInstructor(request, response) {
  const payload = instructorPayload(request.body);
  const { data, error } = await supabase
    .from("instructors")
    .update(payload)
    .eq("id", request.params.id)
    .select()
    .maybeSingle();
  throwIfSupabaseError(error);
  if (!data) {
    throw createHttpError("Instructor was not found.", 404);
  }
  await writeAuditLog(request.user.id, "UPDATE_INSTRUCTOR", `Updated instructor ${data.staff_number}.`);
  return response.json({ instructor: data });
}

async function mySubjects(request, response) {
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

  let assignmentsQuery = supabase
    .from("instructor_assignments")
    .select(`
      id, subject_id, academic_term_id,
      subjects(id, subject_code, subject_name),
      academic_terms(id, term_name, academic_session)
    `)
    .eq("instructor_id", instructor.id)
    .eq("status", "active")
    .order("assigned_at", { ascending: false });

  if (request.query.termId) {
    assignmentsQuery = assignmentsQuery.eq("academic_term_id", request.query.termId);
  }

  const { data: assignments, error: assignmentError } = await assignmentsQuery;
  throwIfSupabaseError(assignmentError);

  const result = [];
  for (const assignment of assignments) {
    const { data: enrolments, error: enrolmentError } = await supabase
      .from("enrolments")
      .select("students(registration_number, first_name, last_name)")
      .eq("subject_id", assignment.subject_id)
      .eq("academic_term_id", assignment.academic_term_id)
      .eq("status", "active")
      .order("enrolled_at");
    throwIfSupabaseError(enrolmentError);
    result.push({
      ...assignment,
      students: enrolments.map((enrolment) => enrolment.students),
    });
  }

  return response.json({ instructor, assignments: result });
}

module.exports = {
  createInstructor,
  listInstructors,
  mySubjects,
  updateInstructor,
};
