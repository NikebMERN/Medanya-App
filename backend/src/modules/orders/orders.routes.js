// src/modules/orders/orders.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const controller = require("./orders.controller");

router.post("/orders/create", auth, controller.create);
router.get("/orders", auth, controller.listMy);
router.get("/orders/:id", auth, controller.getOrder);
router.get("/orders/:id/confirmation", auth, controller.getConfirmation);
router.post("/orders/:id/notify-payment-received", auth, controller.notifyPaymentReceived);
router.get("/orders/:id/delivery-code", auth, controller.getDeliveryCode);
router.get("/orders/:id/delivery-qr", auth, controller.getDeliveryQrToken);
router.post("/orders/:id/confirm-delivery", auth, controller.confirmDelivery);
router.post("/orders/:id/confirm-delivery-qr", auth, controller.confirmDeliveryByQr);
router.post("/orders/:id/cancel-cod", auth, controller.cancelCod);
router.post("/orders/:id/propose-delivery-fee", auth, controller.proposeDeliveryFee);
router.post("/orders/:id/accept-delivery-fee", auth, controller.acceptDeliveryFee);
router.post("/orders/:id/decline-delivery-fee", auth, controller.declineDeliveryFee);
router.patch("/orders/:id/confirm-delivery-fee", auth, controller.confirmDeliveryFee);

router.patch("/seller/orders/:id/accept", auth, controller.sellerAccept);
router.patch("/seller/orders/:id/reject", auth, controller.sellerReject);
router.patch("/seller/orders/:id/status", auth, controller.sellerStatus);
router.patch("/seller/orders/:id/mark-delivered", auth, controller.sellerMarkDelivered);

module.exports = router;
