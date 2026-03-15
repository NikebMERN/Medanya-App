/**
 * Web: Stripe Payment Sheet is native-only. Always return false so caller uses checkout URL fallback.
 */
export async function tryPaymentSheet(clientSecret, merchantDisplayName) {
  return { paid: false };
}
