const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");
const { writeAuditLog } = require("../utils/audit");
const {
  createHttpError,
  optionalText,
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

  const instructorProfile = role === "instructor"
    ? {
      staff_number: requiredText(request.body.staffNumber, "Staff number").toUpperCase(),
      first_name: firstName,
      last_name: lastName,
      phone: requiredText(request.body.phone, "Phone number"),
      email,
      qualification: optionalText(request.body.qualification),
      status: "active",
    }
    : null;

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

  let instructor = null;
  if (instructorProfile) {
    const { data: createdInstructor, error: instructorError } = await supabase
      .from("instructors")
      .insert({
        ...instructorProfile,
        user_id: data.id,
      })
      .select()
      .single();

    if (instructorError) {
      const { error: cleanupError } = await supabase
        .from("users")
        .delete()
        .eq("id", data.id);

      if (cleanupError) {
        console.error("Could not remove incomplete instructor account:", cleanupError.message);
      }
      throwIfSupabaseError(instructorError);
    }

    instructor = createdInstructor;
  }

  const action = instructor ? "CREATE_INSTRUCTOR_ACCOUNT" : "CREATE_USER";
  const details = instructor
    ? `Created and linked instructor ${instructor.staff_number}: ${email}.`
    : `Created ${role} account: ${email}.`;
  await writeAuditLog(request.user.id, action, details);

  return response.status(201).json({ user: data, instructor });
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

module.exports = {
  createUser,
  listUsers,
  updateUserStatus,
};
