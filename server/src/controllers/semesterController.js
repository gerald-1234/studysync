const supabase = require("../config/supabase");
const { writeAuditLog } = require("../utils/audit");
const {
  createHttpError,
  requiredText,
  throwIfSupabaseError,
} = require("../utils/helpers");

function semesterPayload(body) {
  const startDate = requiredText(body.startDate, "Start date");
  const endDate = requiredText(body.endDate, "End date");
  if (startDate > endDate) {
    throw createHttpError("Start date cannot be after end date.");
  }
  return {
    semester_name: requiredText(body.semesterName, "Semester name"),
    academic_session: requiredText(body.academicSession, "Academic session"),
    start_date: startDate,
    end_date: endDate,
    status: body.status === "closed" ? "closed" : "open",
  };
}

async function listSemesters(_request, response) {
  const { data, error } = await supabase
    .from("semesters")
    .select("*")
    .order("start_date", { ascending: false });
  throwIfSupabaseError(error);
  return response.json({ semesters: data });
}

async function createSemester(request, response) {
  const { data, error } = await supabase
    .from("semesters")
    .insert(semesterPayload(request.body))
    .select()
    .single();
  throwIfSupabaseError(error);
  await writeAuditLog(request.user.id, "CREATE_SEMESTER", `Created ${data.semester_name} ${data.academic_session}.`);
  return response.status(201).json({ semester: data });
}

async function updateSemester(request, response) {
  const { data, error } = await supabase
    .from("semesters")
    .update(semesterPayload(request.body))
    .eq("id", request.params.id)
    .select()
    .maybeSingle();
  throwIfSupabaseError(error);
  if (!data) {
    throw createHttpError("Semester was not found.", 404);
  }
  await writeAuditLog(request.user.id, "UPDATE_SEMESTER", `Updated ${data.semester_name} ${data.academic_session}.`);
  return response.json({ semester: data });
}

module.exports = { createSemester, listSemesters, updateSemester };
