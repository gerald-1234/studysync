const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { writeAuditLog } = require("../utils/audit");
const {
  createHttpError,
  throwIfSupabaseError,
  validEmail,
  validPassword,
} = require("../utils/helpers");

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

async function login(request, response) {
  const email = validEmail(request.body.email);
  const password = validPassword(request.body.password);
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  throwIfSupabaseError(error);

  const now = new Date();
  const currentlyLocked = user?.locked_until && new Date(user.locked_until) > now;
  const passwordMatches = user && user.is_active && !currentlyLocked
    ? await bcrypt.compare(password, user.password_hash)
    : false;

  if (!passwordMatches) {
    if (user && !currentlyLocked) {
      const failedAttempts = user.failed_login_attempts + 1;
      const lockedUntil = failedAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(now.getTime() + LOCK_MINUTES * 60 * 1000).toISOString()
        : null;
      await supabase
        .from("users")
        .update({
          failed_login_attempts: failedAttempts,
          locked_until: lockedUntil,
        })
        .eq("id", user.id);
    }
    throw createHttpError("Invalid email or password.", 401);
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq("id", user.id);
  throwIfSupabaseError(updateError);

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h", algorithm: "HS256" },
  );

  await writeAuditLog(user.id, "LOGIN", "User signed in.");

  return response.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    },
  });
}

async function me(request, response) {
  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, role, is_active")
    .eq("id", request.user.id)
    .maybeSingle();
  throwIfSupabaseError(error);

  if (!user || !user.is_active) {
    throw createHttpError("Your account is not active.", 401);
  }

  const { data: instructor, error: instructorError } = await supabase
    .from("instructors")
    .select("id")
    .eq("user_id", request.user.id)
    .maybeSingle();
  throwIfSupabaseError(instructorError);

  return response.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      instructorId: instructor?.id || null,
    },
  });
}

async function logout(request, response) {
  await writeAuditLog(request.user.id, "LOGOUT", "User signed out.");
  return response.status(204).send();
}

module.exports = { login, logout, me };
