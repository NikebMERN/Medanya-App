# Stripe Connect Payout + Confirmation Reveal Testing Guide

## Overview

- **Seller Payout Setup**: Stripe Connect Express onboarding; sellers connect bank via Stripe (no raw bank numbers in app).
- **Accept Gating**: Sellers cannot accept Stripe orders without `payouts_enabled`.
- **Confirmation Reveal**: Buyer sees masked code until seller marks `OUT_FOR_DELIVERY`; then can reveal code/QR.
- **Payout Release**: Seller is paid to connected account only after delivery confirmation (code/QR).

---

## 1. Stripe Test Mode

Use Stripe test keys:

- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`

Buyer test card: `4242 4242 4242 4242`

---

## 2. Database Migrations

Run migrations in order:

```bash
cd backend
# Apply migrations (adjust for your migrate script)
node src/database/migrate.js  # or your migration runner
```

Relevant migrations:

- `053_users_stripe_connect.sql` – `stripe_account_id`, `stripe_onboarding_status`, `stripe_payouts_enabled`, `stripe_charges_enabled`
- `054_orders_payout_cod_deposit.sql` – `payout_status`, `payout_transfer_id`
- `057_stripe_details_and_payout_error.sql` – `stripe_details_submitted`, `payout_error`

---

## 3. Stripe Connect Webhook (account.updated)

In Stripe Dashboard → Webhooks:

1. Create webhook endpoint: `https://your-api.com/api/webhooks/stripe`
2. Add event: `account.updated`
3. Copy the signing secret to `STRIPE_WEBHOOK_SECRET` (or use same endpoint if you already have one).

---

## 4. Seller Payout Setup Flow

1. **Seller opens Profile → Earnings / Payouts**
2. Tap **Set up payouts** → calls `POST /api/payments/stripe/connect/onboard`
3. App opens returned URL in browser (Stripe Connect onboarding)
4. Seller completes Stripe onboarding (test mode: use test data)
5. After redirect, pull-to-refresh on Payout Setup screen → `GET /api/payments/stripe/connect/status`
6. Should show **Payouts Enabled ✓**

---

## 5. Place Stripe Order

1. Buyer pays with test card
2. PaymentIntent webhook sets `capture_status=CAPTURED`, `escrow_status=HELD`
3. Order is created with `order_confirmations` record (Stripe only)

---

## 6. Seller Accept (Payouts Gated)

- **Without payouts enabled**: Accept returns `400 PAYOUTS_NOT_SETUP` with message "Please set up payouts to accept card orders."
- **With payouts enabled**: Accept succeeds, status → `ACCEPTED`

---

## 7. Confirmation Reveal (QR/7-digit)

- **Before `OUT_FOR_DELIVERY`**:
  - Buyer always sees confirmation section for Stripe orders
  - Masked code: `****1234`
  - Message: "Locked. Seller must mark Out for delivery."
  - Reveal and QR buttons disabled
- **After seller marks `OUT_FOR_DELIVERY`**:
  - Buyer can tap **Reveal** → calls `GET /api/orders/:id/confirmation`
  - Returns `{ canReveal: true, code, qrPayload }`
  - QR button enabled; buyer shows code/QR to seller

COD orders: no confirmation section (no code/QR).

---

## 8. Delivery Confirmation & Payout

1. Seller receives code or QR from buyer
2. Seller taps **Confirm delivery** → `POST /api/orders/:id/confirm-delivery` (code) or `confirm-delivery-qr` (token)
3. Backend validates, marks confirmation used
4. Creates Stripe Transfer to seller connected account
5. Sets `orders.payout_status=PAID`, `payout_transfer_id=tr_xxx`
6. Updates `order_payments.escrow_status=RELEASED`
7. Order status → `COMPLETED`

---

## 9. cURL / Postman Examples

### Onboard (create link)

```bash
curl -X POST "https://your-api.com/api/payments/stripe/connect/onboard" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json"
# Response: { "success": true, "url": "https://connect.stripe.com/..." }
```

### Status check

```bash
curl -X GET "https://your-api.com/api/payments/stripe/connect/status" \
  -H "Authorization: Bearer YOUR_JWT"
# Response: { "success": true, "onboardingStatus": "COMPLETE", "payoutsEnabled": true, ... }
```

### Confirmation reveal (buyer)

```bash
curl -X GET "https://your-api.com/api/orders/123/confirmation" \
  -H "Authorization: Bearer BUYER_JWT"
# Before OUT_FOR_DELIVERY: { "canReveal": false, "maskedCode": "****1234", "reason": "NOT_READY" }
# After OUT_FOR_DELIVERY: { "canReveal": true, "code": "1234567", "qrPayload": { "orderId": "123", "qrToken": "..." } }
```

### Seller confirm delivery (code)

```bash
curl -X POST "https://your-api.com/api/orders/123/confirm-delivery" \
  -H "Authorization: Bearer SELLER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"code": "1234567"}'
```

### Seller confirm delivery (QR)

```bash
curl -X POST "https://your-api.com/api/orders/123/confirm-delivery-qr" \
  -H "Authorization: Bearer SELLER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"token": "BASE64_SIGNED_PAYLOAD_FROM_BUYER_QR"}'
```

---

## 10. Verify in Logs / DB

- `orders.payout_status = 'PAID'`
- `orders.payout_transfer_id = 'tr_xxx'`
- `order_payments.escrow_status = 'RELEASED'`
- Stripe Dashboard → Transfers: transfer to connected account appears

---

## 11. Transfer Failure

If Transfer fails (e.g. invalid connected account):

- `orders.payout_status = 'FAILED'`
- `orders.payout_error = "error message"`
- Order still completes; funds remain on platform (create retry job if needed).
