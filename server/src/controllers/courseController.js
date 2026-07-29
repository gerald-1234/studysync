const supabase = require("../config/supabase");
const { writeAuditLog } = require("../utils/audit");
const {
  createHttpError,
  optionalText,
  requiredText,
  throwIfSupabaseError,
} = require("../utils/helpers");

function coursePayload(body) {
  return {
    course_code: requiredText(body.courseCode, "Course code").toUpperCase(),
    course_name: requiredText(body.courseName, "Course name"),
    description: optionalText(body.description),
    level: optionalText(body.level),
    status: body.status === "inactive" ? "inactive" : "active",
  };
}

async function listCourses(request, response) {
  let query = supabase.from("courses").select("*").order("course_name");
  if (request.query.activeOnly === "true") {
    query = query.eq("status", "active");
  }
  const { data, error } = await query;
  throwIfSupabaseError(error);
  return response.json({ courses: data });
}

async function createCourse(request, response) {
  const { data, error } = await supabase
    .from("courses")
    .insert(coursePayload(request.body))
    .select()
    .single();
  throwIfSupabaseError(error);
  await writeAuditLog(request.user.id, "CREATE_COURSE", `Created course ${data.course_code}.`);
  return response.status(201).json({ course: data });
}

async function updateCourse(request, response) {
  const { data, error } = await supabase
    .from("courses")
    .update(coursePayload(request.body))
    .eq("id", request.params.id)
    .select()
    .maybeSingle();
  throwIfSupabaseError(error);
  if (!data) {
    throw createHttpError("Course was not found.", 404);
  }
  await writeAuditLog(request.user.id, "UPDATE_COURSE", `Updated course ${data.course_code}.`);
  return response.json({ course: data });
}

module.exports = { createCourse, listCourses, updateCourse };
