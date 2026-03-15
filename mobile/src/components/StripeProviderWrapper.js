/**
 * Native: Wrap app with StripeProvider for in-app payments.
 */
import React from "react";
import { StripeProvider } from "@stripe/stripe-react-native";

export function StripeProviderWrapper({ children, publishableKey, merchantIdentifier }) {
  return (
    <StripeProvider publishableKey={publishableKey} merchantIdentifier={merchantIdentifier}>
      {children}
    </StripeProvider>
  );
}
