const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");
const { writeAuditLog } = require("../utils/audit");
const {
  createHttpError,
  requiredText,
  throwIfSupabaseError,
  validEmail,
  validPassword,
} = require("../utils/helpers");

const USER_ROLES = ["admin", "registration_officer", "manager", "instructor"];

async function listUsers(_request, response) {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, role, is_active, created_at")
    .order("created_at", { ascending: false });
  throwIfSupabaseError(error);
  return response.json({ users: data });
}

async function createUser(request, response) {
  const firstName = requiredText(request.body.firstName, "First name");
  const lastName = requiredText(request.body.lastName, "Last name");
  const email = validEmail(request.body.email);
  const password = validPassword(request.body.password);
  const role = requiredText(request.body.role, "Role");

  if (!USER_ROLES.includes(role)) {
    throw createHttpError("Role must be admin, registration_officer, manager, or instructor.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { data, error } = await supabase
    .from("users")
    .insert({
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash: passwordHash,
      role,
    })
    .select("id, email, first_name, last_name, role, is_active, created_at")
    .single();
  throwIfSupabaseError(error);

  await writeAuditLog(request.user.id, "CREATE_USER", `Created ${role} account: ${email}.`);
  return response.status(201).json({ user: data });
}

async function updateUserStatus(request, response) {
  const isActive = Boolean(request.body.isActive);
  if (request.params.id === request.user.id && !isActive) {
    throw createHttpError("You cannot deactivate your own account.");
  }

  const { data, error } = await supabase
    .from("users")
    .update({ is_active: isActive })
    .eq("id", request.params.id)
    .select("id, email, first_name, last_name, role, is_active")
    .maybeSingle();
  throwIfSupabaseError(error);

  if (!data) {
    throw createHttpError("User account was not found.", 404);
  }

  await writeAuditLog(
    request.user.id,
    isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
    `Updated account status for ${data.email}.`,
  );
  return response.json({ user: data });
}

async function availableInstructorAccounts(_request, response) {
  const { data: instructorProfiles, error: profileError } = await supabase
    .from("instructors")
    .select("user_id")
    .not("user_id", "is", null);
  throwIfSupabaseError(profileError);

  const linkedUserIds = instructorProfiles.map((profile) => profile.user_id);
  let query = supabase
    .from("users")
    .select("id, email, first_name, last_name")
    .eq("role", "instructor")
    .eq("is_active", true)
    .order("last_name");

  if (linkedUserIds.length) {
    query = query.not("id", "in", `(${linkedUserIds.join(",")})`);
  }

  const { data, error } = await query;
  throwIfSupabaseError(error);
  return response.json({ users: data });
}

module.exports = {
  availableInstructorAccounts,
  createUser,
  listUsers,
  updateUserStatus,
};
