const supabase = require("../config/supabase");
const { writeAuditLog } = require("../utils/audit");
const {
  createHttpError,
  requiredText,
  throwIfSupabaseError,
} = require("../utils/helpers");

function termPayload(body) {
  const startDate = requiredText(body.startDate, "Start date");
  const endDate = requiredText(body.endDate, "End date");
  if (startDate > endDate) {
    throw createHttpError("Start date cannot be after end date.");
  }
  return {
    term_name: requiredText(body.termName, "Term name"),
    academic_session: requiredText(body.academicSession, "Academic session"),
    start_date: startDate,
    end_date: endDate,
    status: body.status === "closed" ? "closed" : "open",
  };
}

async function listTerms(_request, response) {
  const { data, error } = await supabase
    .from("academic_terms")
    .select("*")
    .order("start_date", { ascending: false });
  throwIfSupabaseError(error);
  return response.json({ terms: data });
}

async function createTerm(request, response) {
  const { data, error } = await supabase
    .from("academic_terms")
    .insert(termPayload(request.body))
    .select()
    .single();
  throwIfSupabaseError(error);
  await writeAuditLog(request.user.id, "CREATE_TERM", `Created ${data.term_name} ${data.academic_session}.`);
  return response.status(201).json({ term: data });
}

async function updateTerm(request, response) {
  const { data, error } = await supabase
    .from("academic_terms")
    .update(termPayload(request.body))
    .eq("id", request.params.id)
    .select()
    .maybeSingle();
  throwIfSupabaseError(error);
  if (!data) {
    throw createHttpError("Academic term was not found.", 404);
  }
  await writeAuditLog(request.user.id, "UPDATE_TERM", `Updated ${data.term_name} ${data.academic_session}.`);
  return response.json({ term: data });
}

module.exports = { createTerm, listTerms, updateTerm };
