const jwt = require("jsonwebtoken");

function authenticate(request, response, next) {
  const header = request.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({ message: "Please sign in to continue." });
  }

  try {
    request.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return response.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}

module.exports = { authenticate };
