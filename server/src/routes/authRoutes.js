const router = require("express").Router();
const { authenticate } = require("../middleware/authMiddleware");
const { asyncHandler } = require("../utils/helpers");
const authController = require("../controllers/authController");

router.post("/login", asyncHandler(authController.login));
router.get("/me", authenticate, asyncHandler(authController.me));
router.post("/logout", authenticate, asyncHandler(authController.logout));

module.exports = router;
