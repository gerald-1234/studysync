const router = require("express").Router();
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/helpers");
const dashboardController = require("../controllers/dashboardController");

router.get(
  "/staff",
  allowRoles("admin", "registration_officer", "manager"),
  asyncHandler(dashboardController.staffDashboard),
);
router.get(
  "/instructor",
  allowRoles("instructor"),
  asyncHandler(dashboardController.instructorDashboard),
);

module.exports = router;
