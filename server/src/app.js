const compression = require("compression");
const cors = require("cors");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

const { authenticate } = require("./middleware/authMiddleware");
const assignmentRoutes = require("./routes/assignmentRoutes");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const enrolmentRoutes = require("./routes/enrolmentRoutes");
const instructorRoutes = require("./routes/instructorRoutes");
const reportRoutes = require("./routes/reportRoutes");
const studentRoutes = require("./routes/studentRoutes");
const courseRoutes = require("./routes/courseRoutes");
const semesterRoutes = require("./routes/semesterRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5500")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("This origin is not allowed to call the StudySync API."));
    },
  }),
);
app.use(express.json({ limit: "200kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "studysync-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", authenticate, userRoutes);
app.use("/api/students", authenticate, studentRoutes);
app.use("/api/courses", authenticate, courseRoutes);
app.use("/api/semesters", authenticate, semesterRoutes);
app.use("/api/instructors", authenticate, instructorRoutes);
app.use("/api/enrolments", authenticate, enrolmentRoutes);
app.use("/api/assignments", authenticate, assignmentRoutes);
app.use("/api/dashboard", authenticate, dashboardRoutes);
app.use("/api/reports", authenticate, reportRoutes);

app.use((_request, response) => {
  response.status(404).json({ message: "Route not found." });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  const statusCode = error.statusCode || 500;
  response.status(statusCode).json({
    message: statusCode === 500 ? "An unexpected server error occurred." : error.message,
  });
});

module.exports = app;
