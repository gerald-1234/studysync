const router = require("express").Router();
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/helpers");
const assignmentController = require("../controllers/assignmentController");

router.get("/", allowRoles("admin", "manager"), asyncHandler(assignmentController.listAssignments));
router.post("/", allowRoles("admin", "manager"), asyncHandler(assignmentController.createAssignment));
router.patch(
  "/:id/cancel",
  allowRoles("admin", "manager"),
  asyncHandler(assignmentController.cancelAssignment),
);

module.exports = router;
