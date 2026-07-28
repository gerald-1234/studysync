const router = require("express").Router();
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/helpers");
const userController = require("../controllers/userController");

router.get("/", allowRoles("admin"), asyncHandler(userController.listUsers));
router.post("/", allowRoles("admin"), asyncHandler(userController.createUser));
router.patch("/:id/status", allowRoles("admin"), asyncHandler(userController.updateUserStatus));
router.get(
  "/available-instructor-accounts",
  allowRoles("admin", "manager"),
  asyncHandler(userController.availableInstructorAccounts),
);

module.exports = router;
