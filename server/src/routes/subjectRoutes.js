const router = require("express").Router();
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/helpers");
const subjectController = require("../controllers/subjectController");

router.get("/", asyncHandler(subjectController.listSubjects));
router.post("/", allowRoles("admin", "manager"), asyncHandler(subjectController.createSubject));
router.patch("/:id", allowRoles("admin", "manager"), asyncHandler(subjectController.updateSubject));

module.exports = router;
