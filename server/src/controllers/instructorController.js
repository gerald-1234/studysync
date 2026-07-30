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

async function myCourses(request, response) {
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
      id, course_id, semester_id,
      courses(id, course_code, course_title),
      semesters(id, semester_name, academic_session)
    `)
    .eq("instructor_id", instructor.id)
    .eq("status", "active")
    .order("assigned_at", { ascending: false });

  if (request.query.semesterId) {
    assignmentsQuery = assignmentsQuery.eq("semester_id", request.query.semesterId);
  }

  const { data: assignments, error: assignmentError } = await assignmentsQuery;
  throwIfSupabaseError(assignmentError);

  const result = [];
  for (const assignment of assignments) {
    const { data: enrolments, error: enrolmentError } = await supabase
      .from("enrolments")
      .select("students(registration_number, first_name, last_name)")
      .eq("course_id", assignment.course_id)
      .eq("semester_id", assignment.semester_id)
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
  listInstructors,
  myCourses,
  updateInstructor,
};
