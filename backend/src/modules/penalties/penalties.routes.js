const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const controller = require("./penalties.controller");

router.use(authMiddleware);

router.get("/my", controller.listMy);
router.get("/:id", controller.getById);
router.post("/:id/pay", controller.createPayment);

module.exports = router;
