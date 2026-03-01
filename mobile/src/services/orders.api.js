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
