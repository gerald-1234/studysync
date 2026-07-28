require("dotenv").config();

const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");

async function createAdmin() {
  const required = [
    "ADMIN_FIRST_NAME",
    "ADMIN_LAST_NAME",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
  ];
  for (const name of required) {
    if (!process.env[name]) {
      throw new Error(`${name} is required in server/.env.`);
    }
  }

  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const { data: existing, error: lookupError } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (lookupError) {
    throw lookupError;
  }
  if (existing) {
    console.log(`An account already exists for ${email}.`);
    return;
  }

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  const { error } = await supabase.from("users").insert({
    first_name: process.env.ADMIN_FIRST_NAME.trim(),
    last_name: process.env.ADMIN_LAST_NAME.trim(),
    email,
    password_hash: passwordHash,
    role: "admin",
  });
  if (error) {
    throw error;
  }

  console.log(`Created admin account for ${email}.`);
}

createAdmin().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
