// src/modules/orders/orders.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const controller = require("./orders.controller");

router.post("/orders/create", auth, controller.create);
router.post("/orders/:id/confirm-delivery", auth, controller.confirmDelivery);
router.get("/orders/:id", auth, controller.getOrder);
router.get("/orders", auth, controller.listMy);

module.exports = router;
