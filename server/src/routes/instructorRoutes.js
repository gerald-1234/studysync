const router = require("express").Router();
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/helpers");
const instructorController = require("../controllers/instructorController");

router.get("/", allowRoles("admin", "manager"), asyncHandler(instructorController.listInstructors));
router.patch("/:id", allowRoles("admin", "manager"), asyncHandler(instructorController.updateInstructor));
router.get("/me/courses", allowRoles("instructor"), asyncHandler(instructorController.myCourses));

module.exports = router;
