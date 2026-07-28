const supabase = require("../config/supabase");
const { writeAuditLog } = require("../utils/audit");
const {
  createHttpError,
  optionalText,
  requiredText,
  throwIfSupabaseError,
} = require("../utils/helpers");

function subjectPayload(body) {
  return {
    subject_code: requiredText(body.subjectCode, "Subject code").toUpperCase(),
    subject_name: requiredText(body.subjectName, "Subject name"),
    description: optionalText(body.description),
    level: optionalText(body.level),
    status: body.status === "inactive" ? "inactive" : "active",
  };
}

async function listSubjects(request, response) {
  let query = supabase.from("subjects").select("*").order("subject_name");
  if (request.query.activeOnly === "true") {
    query = query.eq("status", "active");
  }
  const { data, error } = await query;
  throwIfSupabaseError(error);
  return response.json({ subjects: data });
}

async function createSubject(request, response) {
  const { data, error } = await supabase
    .from("subjects")
    .insert(subjectPayload(request.body))
    .select()
    .single();
  throwIfSupabaseError(error);
  await writeAuditLog(request.user.id, "CREATE_SUBJECT", `Created subject ${data.subject_code}.`);
  return response.status(201).json({ subject: data });
}

async function updateSubject(request, response) {
  const { data, error } = await supabase
    .from("subjects")
    .update(subjectPayload(request.body))
    .eq("id", request.params.id)
    .select()
    .maybeSingle();
  throwIfSupabaseError(error);
  if (!data) {
    throw createHttpError("Subject was not found.", 404);
  }
  await writeAuditLog(request.user.id, "UPDATE_SUBJECT", `Updated subject ${data.subject_code}.`);
  return response.json({ subject: data });
}

module.exports = { createSubject, listSubjects, updateSubject };
