/**
 * Native: Use Stripe Payment Sheet.
 */
export async function tryPaymentSheet(clientSecret, merchantDisplayName) {
  const stripe = require("@stripe/stripe-react-native");
  if (!stripe?.initPaymentSheet || !stripe?.presentPaymentSheet) return { paid: false };
  const { error: initErr } = await stripe.initPaymentSheet({
    paymentIntentClientSecret: clientSecret,
    merchantDisplayName: merchantDisplayName || "Medanya",
  });
  if (initErr) throw initErr;
  const { error: presentErr } = await stripe.presentPaymentSheet();
  if (presentErr) {
    if (presentErr.code === "Canceled") return { paid: false };
    throw presentErr;
  }
  return { paid: true };
}
