const router = require("express").Router();
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/helpers");
const enrolmentController = require("../controllers/enrolmentController");

const staffRoles = ["admin", "registration_officer", "manager"];

router.get("/", allowRoles(...staffRoles), asyncHandler(enrolmentController.listEnrolments));
router.post("/", allowRoles(...staffRoles), asyncHandler(enrolmentController.createEnrolments));
router.patch(
  "/:id/cancel",
  allowRoles(...staffRoles),
  asyncHandler(enrolmentController.cancelEnrolment),
);

module.exports = router;
