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
