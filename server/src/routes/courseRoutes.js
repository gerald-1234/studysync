const router = require("express").Router();
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/helpers");
const courseController = require("../controllers/courseController");

router.get("/", asyncHandler(courseController.listCourses));
router.post("/", allowRoles("admin", "manager"), asyncHandler(courseController.createCourse));
router.patch("/:id", allowRoles("admin", "manager"), asyncHandler(courseController.updateCourse));

module.exports = router;
