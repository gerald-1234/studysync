const router = require("express").Router();
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/helpers");
const reportController = require("../controllers/reportController");

const staffRoles = ["admin", "registration_officer", "manager"];

router.get(
  "/subject-enrolments",
  allowRoles(...staffRoles),
  asyncHandler(reportController.subjectEnrolmentReport),
);
router.get(
  "/instructor-assignments",
  allowRoles(...staffRoles),
  asyncHandler(reportController.instructorAssignmentReport),
);
router.get("/audit-logs", allowRoles("admin"), asyncHandler(reportController.auditLogReport));

module.exports = router;
