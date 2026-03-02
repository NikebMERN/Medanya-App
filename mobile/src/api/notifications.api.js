import client from "./client";

export async function listNotifications(params = {}) {
  const { data } = await client.get("/notifications", { params });
  return {
    notifications: data?.notifications ?? [],
    unseenCount: data?.unseenCount ?? 0,
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    limit: data?.limit ?? 20,
  };
}

export async function getUnseenCount() {
  const { data } = await client.get("/notifications/unseen-count");
  return data?.count ?? 0;
}

export async function markNotificationSeen(id) {
  const { data } = await client.patch(`/notifications/${id}/seen`);
  return data?.affected ?? 0;
}

export async function markAllNotificationsSeen() {
  const { data } = await client.patch("/notifications/seen-all");
  return data?.affected ?? 0;
}

/** Remove a notification (e.g. after opening an order – it disappears from the list). */
export async function deleteNotification(id) {
  const { data } = await client.delete(`/notifications/${id}`);
  return data?.affected ?? 0;
}
