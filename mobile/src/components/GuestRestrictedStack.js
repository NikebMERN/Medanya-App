import React from "react";
import { useAuthStore } from "../store/auth.store";
import GuestGate from "./GuestGate";

/**
 * When user is guest, shows GuestGate. Otherwise renders children (the actual stack).
 */
export default function GuestRestrictedStack({ children, message }) {
  const user = useAuthStore((s) => s.user);
  const isGuest = user?.isGuest ?? false;

  if (isGuest) {
    return <GuestGate message={message} />;
  }
  return children;
}
