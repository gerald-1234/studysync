const supabase = require("../config/supabase");
const { writeAuditLog } = require("../utils/audit");
const {
  createHttpError,
  optionalText,
  requiredText,
  throwIfSupabaseError,
} = require("../utils/helpers");

function studentPayload(body) {
  const gender = requiredText(body.gender, "Gender");
  if (!["Female", "Male"].includes(gender)) {
    throw createHttpError("Gender must be Female or Male.");
  }

  return {
    registration_number: requiredText(body.registrationNumber, "Registration number").toUpperCase(),
    first_name: requiredText(body.firstName, "First name"),
    last_name: requiredText(body.lastName, "Last name"),
    gender,
    phone: requiredText(body.phone, "Phone number"),
    email: optionalText(body.email),
    faculty: requiredText(body.faculty, "Faculty"),
    department: optionalText(body.department),
    emergency_contact_phone: requiredText(body.emergencyContactPhone, "Emergency contact phone"),
    status: body.status === "inactive" ? "inactive" : "active",
  };
}

async function listStudents(request, response) {
  const search = optionalText(request.query.search);
  let query = supabase
    .from("students")
    .select("*")
    .order("last_name")
    .order("first_name")
    .limit(100);

  if (search) {
    const safeSearch = search.replace(/[,%().]/g, "");
    query = query.or(
      `registration_number.ilike.%${safeSearch}%,first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%,faculty.ilike.%${safeSearch}%,department.ilike.%${safeSearch}%`,
    );
  }

  const { data, error } = await query;
  throwIfSupabaseError(error);
  return response.json({ students: data });
}

async function getStudent(request, response) {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", request.params.id)
    .maybeSingle();
  throwIfSupabaseError(error);
  if (!data) {
    throw createHttpError("Student was not found.", 404);
  }
  return response.json({ student: data });
}

async function createStudent(request, response) {
  const { data, error } = await supabase
    .from("students")
    .insert(studentPayload(request.body))
    .select()
    .single();
  throwIfSupabaseError(error);
  await writeAuditLog(request.user.id, "CREATE_STUDENT", `Created student ${data.registration_number}.`);
  return response.status(201).json({ student: data });
}

async function updateStudent(request, response) {
  const { data, error } = await supabase
    .from("students")
    .update(studentPayload(request.body))
    .eq("id", request.params.id)
    .select()
    .maybeSingle();
  throwIfSupabaseError(error);
  if (!data) {
    throw createHttpError("Student was not found.", 404);
  }
  await writeAuditLog(request.user.id, "UPDATE_STUDENT", `Updated student ${data.registration_number}.`);
  return response.json({ student: data });
}

async function getStudentEnrolments(request, response) {
  const { data, error } = await supabase
    .from("enrolments")
    .select("id, status, enrolled_at, courses(course_code, course_title), semesters(semester_name, academic_session)")
    .eq("student_id", request.params.id)
    .order("enrolled_at", { ascending: false });
  throwIfSupabaseError(error);
  return response.json({ enrolments: data });
}

module.exports = {
  createStudent,
  getStudent,
  getStudentEnrolments,
  listStudents,
  updateStudent,
};
