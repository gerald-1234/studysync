const supabase = require("../config/supabase");

async function writeAuditLog(userId, action, details) {
  const { error } = await supabase.from("audit_logs").insert({
    user_id: userId,
    action,
    details,
  });

  if (error) {
    console.error("Unable to write audit log:", error.message);
  }
}

module.exports = { writeAuditLog };
