import client from "../api/client";

export async function createOrder(body) {
  const { data } = await client.post("/orders/create", body);
  return data;
}

export async function getOrder(orderId) {
  const { data } = await client.get(`/orders/${orderId}`);
  return data?.order ?? data;
}

export async function confirmDelivery(orderId, code) {
  const { data } = await client.post(`/orders/${orderId}/confirm-delivery`, { code });
  return data?.order ?? data;
}

export async function listMyOrders(params = {}) {
  const { data } = await client.get("/orders", { params });
  return {
    orders: data?.orders ?? [],
    page: data?.page ?? 1,
    limit: data?.limit ?? 20,
    total: data?.total ?? 0,
  };
}

/** Get delivery code reveal (server returns code; only call after biometric/PIN). */
export async function getDeliveryCode(orderId) {
  const { data } = await client.get(`/orders/${orderId}/delivery-code`);
  return data?.code ?? data;
}

/** Get QR token for handover (orderId + signed token for seller to scan). */
export async function getDeliveryQrToken(orderId) {
  const { data } = await client.get(`/orders/${orderId}/delivery-qr`);
  return data?.token ?? data?.qrPayload ?? data;
}

/** Seller: verify delivery via QR scan (token from buyer's QR). */
export async function confirmDeliveryByQr(orderId, qrToken) {
  const { data } = await client.post(`/orders/${orderId}/confirm-delivery-qr`, { token: qrToken });
  return data?.order ?? data;
}

/** Buyer or seller: cancel/decline a COD order. Seller must send reason + reasonOther when reason is "other". */
export async function cancelCodOrder(orderId, body = {}) {
  const { data } = await client.post(`/orders/${orderId}/cancel-cod`, body);
  return data?.order ?? data;
}

/** Seller: propose a delivery fee (cents) for a COD order. */
export async function proposeDeliveryFee(orderId, deliveryFeeCents) {
  const { data } = await client.post(`/orders/${orderId}/propose-delivery-fee`, { deliveryFeeCents });
  return data?.order ?? data;
}

/** Buyer: accept the proposed delivery fee; order total is updated, seller can start delivery. */
export async function acceptDeliveryFee(orderId) {
  const { data } = await client.post(`/orders/${orderId}/accept-delivery-fee`);
  return data?.order ?? data;
}

/** Buyer: decline the proposed delivery fee; order is cancelled. */
export async function declineDeliveryFee(orderId) {
  const { data } = await client.post(`/orders/${orderId}/decline-delivery-fee`);
  return data?.order ?? data;
}

/** Buyer: confirm or decline proposed delivery fee (COD, status ACCEPTED_PENDING_FEE_CONFIRM). */
export async function confirmDeliveryFee(orderId, action) {
  const { data } = await client.patch(`/orders/${orderId}/confirm-delivery-fee`, { action });
  return data?.order ?? data;
}

/** Buyer: get confirmation state (canReveal, maskedCode, revealHint; if canReveal then code + qrPayload). */
export async function getOrderConfirmation(orderId) {
  const { data } = await client.get(`/orders/${orderId}/confirmation`);
  return data;
}

/** Buyer: notify seller that Stripe payment was received (creates in-app notification; fallback if webhook didn't fire). */
export async function notifyPaymentReceived(orderId) {
  const { data } = await client.post(`/orders/${orderId}/notify-payment-received`);
  return data;
}

/** Seller: accept order (PLACED -> ACCEPTED or, for COD, ACCEPTED_PENDING_FEE_CONFIRM with optional deliveryFeeCents). */
export async function sellerAcceptOrder(orderId, body = {}) {
  const { data } = await client.patch(`/seller/orders/${orderId}/accept`, body);
  return data?.order ?? data;
}

/** Seller: reject order (PLACED -> CANCELLED; Stripe refunded). */
export async function sellerRejectOrder(orderId) {
  const { data } = await client.patch(`/seller/orders/${orderId}/reject`);
  return data?.order ?? data;
}

/** Seller: update status to PACKED or OUT_FOR_DELIVERY. */
export async function sellerUpdateOrderStatus(orderId, status) {
  const { data } = await client.patch(`/seller/orders/${orderId}/status`, { status });
  return data?.order ?? data;
}

/** Seller: mark COD order as delivered (no code). Allowed when OUT_FOR_DELIVERY or DELIVERED. */
export async function sellerMarkDelivered(orderId) {
  const { data } = await client.patch(`/seller/orders/${orderId}/mark-delivered`);
  return data?.order ?? data;
}
