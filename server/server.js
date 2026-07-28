require("dotenv").config();

const requiredVariables = ["SUPABASE_URL", "JWT_SECRET"];
for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`${variable} is missing from server/.env`);
  }
}

if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SECRET_KEY is missing from server/.env");
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters.");
}

const app = require("./src/app");
const port = Number(process.env.PORT) || 5000;

app.listen(port, "0.0.0.0", () => {
  console.log(`StudySync API running on port ${port}`);
});
