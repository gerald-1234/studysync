const router = require("express").Router();
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/helpers");
const semesterController = require("../controllers/semesterController");

router.get("/", asyncHandler(semesterController.listSemesters));
router.post("/", allowRoles("admin", "manager"), asyncHandler(semesterController.createSemester));
router.patch("/:id", allowRoles("admin", "manager"), asyncHandler(semesterController.updateSemester));

module.exports = router;
