/**
 * Web: Stripe is native-only. Return no-op stubs.
 */
export function useStripe() {
  return {
    initPaymentSheet: async () => ({ error: { message: "Stripe unavailable on web" } }),
    presentPaymentSheet: async () => ({ error: { code: "Canceled", message: "Use mobile app to pay" } }),
  };
}
