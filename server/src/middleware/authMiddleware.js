const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

async function authenticate(request, response, next) {
  const header = request.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({ message: "Please sign in to continue." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

    // Re-check the account on every request so a deactivated or demoted user
    // loses access immediately instead of when their token expires.
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, role, is_active")
      .eq("id", payload.id)
      .maybeSingle();

    if (error) throw error;
    if (!user || !user.is_active) {
      return response.status(401).json({ message: "Your account is not active. Please contact an administrator." });
    }

    request.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    };
    return next();
  } catch {
    return response.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}

module.exports = { authenticate };
