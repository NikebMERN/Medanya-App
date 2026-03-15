/**
 * Web: Stripe is native-only; use a pass-through wrapper.
 */
import React from "react";

export function StripeProviderWrapper({ children }) {
  return children;
}
