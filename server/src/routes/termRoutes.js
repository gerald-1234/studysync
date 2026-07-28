const router = require("express").Router();
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/helpers");
const termController = require("../controllers/termController");

router.get("/", asyncHandler(termController.listTerms));
router.post("/", allowRoles("admin", "manager"), asyncHandler(termController.createTerm));
router.patch("/:id", allowRoles("admin", "manager"), asyncHandler(termController.updateTerm));

module.exports = router;
