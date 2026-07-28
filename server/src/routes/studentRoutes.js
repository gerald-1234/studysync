const router = require("express").Router();
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/helpers");
const studentController = require("../controllers/studentController");

const staffRoles = ["admin", "registration_officer", "manager"];

router.get("/", allowRoles(...staffRoles), asyncHandler(studentController.listStudents));
router.post("/", allowRoles(...staffRoles), asyncHandler(studentController.createStudent));
router.get("/:id", allowRoles(...staffRoles), asyncHandler(studentController.getStudent));
router.patch("/:id", allowRoles(...staffRoles), asyncHandler(studentController.updateStudent));
router.get(
  "/:id/enrolments",
  allowRoles(...staffRoles),
  asyncHandler(studentController.getStudentEnrolments),
);

module.exports = router;
