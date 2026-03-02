# How to Test COD + Stripe + Webhooks (Unified Delivery Confirmation)

This guide covers local testing of the unified delivery confirmation flow for both **Cash on Delivery (COD)** and **Card (Stripe)** orders, including QR + 7-digit code and escrow.

## Seller payouts (Stripe Connect)

Sellers are paid to their **bank only after delivery confirmation** (QR or 7-digit). No internal wallet payout for marketplace orders when Connect is used.

- **Stripe Connect**: Sellers must complete Express onboarding before they can accept orders.
- **Stripe (full)**: Buyer pays full amount at checkout → escrow HELD → on delivery confirm → **Transfer** to seller's Connect account.
- **COD Option A**: Buyer pays a **small deposit** online (Stripe) at checkout; the rest is paid **cash on delivery**. On delivery confirm, the deposit is **Transferred** to seller's Connect account.
- Set `COD_OPTION_B=1` in `.env` to disable deposit (COD 100% offline; seller cannot be paid via Stripe for COD).

---

## 1. Local setup

### Backend `.env`

- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...` (from Stripe CLI, see below)
- `JWT_SECRET` or `ORDERS_QR_SECRET` (for QR/code signing)
- **Stripe Connect**: `STRIPE_CONNECT_COUNTRY=AE`, `STRIPE_CONNECT_RETURN_URL=medanya://stripe-connect-return`, `STRIPE_CONNECT_REFRESH_URL=medanya://stripe-connect-refresh`
- **COD deposit (Option A)**: `COD_DEPOSIT_FIXED_CENTS=200`, `COD_DEPOSIT_PERCENT_BPS=500`, `COD_DEPOSIT_MIN_CENTS=100`, `COD_DEPOSIT_MAX_CENTS=5000`

### Stripe CLI (webhooks to localhost)

```bash
stripe listen --forward-to http://localhost:4001/api/webhooks/stripe
```

Use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET` in `.env`.

### Test card

- **Number:** `4242 4242 4242 4242`
- **Expiry:** any future date (e.g. 12/34)
- **CVC:** any 3 digits

---

## 2. Test COD flow (Option A: deposit at checkout)

1. **Seller:** Must have completed Stripe Connect onboarding (payouts enabled). Otherwise "Set up payouts" in profile and complete Express onboarding.
2. **Buyer:** Place COD order  
   - `POST /api/orders/create`  
   - Body: `{ "listingId": <id>, "qty": 1, "paymentMethod": "COD", "address": { ... } }`  
   - Response includes `clientSecret` for the **deposit** PaymentIntent (if Option A). Buyer pays deposit with test card.
   - Order is created with `cod_deposit_cents`, `cod_cash_due_cents` (rest to pay cash on delivery), status `PLACED`, and `order_confirmations` row.

2. **Seller:** Accept order  
   - `PATCH /api/seller/orders/:id/accept`  
   - Status → `ACCEPTED`.

3. **Seller:** Mark packed  
   - `PATCH /api/seller/orders/:id/status`  
   - Body: `{ "status": "PACKED" }`.

4. **Seller:** Out for delivery  
   - `PATCH /api/seller/orders/:id/status`  
   - Body: `{ "status": "OUT_FOR_DELIVERY" }`.

5. **Buyer:** Reveal code/QR (only allowed when status is `OUT_FOR_DELIVERY`)  
   - `GET /api/orders/:id/confirmation` → `canReveal: true`, optional `code`, `qrPayload`.  
   - Or `GET /api/orders/:id/delivery-code` and `GET /api/orders/:id/delivery-qr`.

6. **Seller:** Confirm delivery (7-digit or QR)  
   - `POST /api/orders/:id/confirm-delivery`  
   - Body: `{ "code": "1234567" }`  
   - Or `POST /api/orders/:id/confirm-delivery-qr`  
   - Body: `{ "token": "<qrPayload from buyer>" }`  
   - Status → `COMPLETED`. **Deposit** is transferred to seller's Connect account (`payout_status=PAID`). Buyer pays `cod_cash_due_cents` in cash offline.

---

## 3. Test Stripe escrow flow

1. **Buyer:** Place Stripe order  
   - `POST /api/orders/create`  
   - Body: `{ "listingId": <id>, "qty": 1, "paymentMethod": "STRIPE", "address": { ... } }`  
   - Response includes `clientSecret` for PaymentSheet.

2. **Buyer:** Confirm payment (e.g. PaymentSheet with test card).  
   - Stripe captures payment (automatic capture).  
   - Webhook `payment_intent.succeeded` → `order_payments`: `capture_status=CAPTURED`, `escrow_status=HELD`.

3. **Seller:** Accept → Mark packed → Out for delivery (same as COD steps 2–4).

4. **Buyer:** Reveal code/QR when status is `OUT_FOR_DELIVERY`.

5. **Seller:** Confirm delivery (code or QR).  
   - Order → `COMPLETED`.  
   - `order_payments.escrow_status` → `RELEASED`.  
   - **Stripe Transfer** to seller's Connect account; `orders.payout_status` → `PAID`, `payout_transfer_id` set.

6. **Refund (e.g. via dispute):**  
   - Admin: `POST /api/admin/disputes/:id/resolve`  
   - Body: `{ "action": "REFUND" }`  
   - Stripe refund + `order_payments.escrow_status=REFUNDED`, order status `REFUNDED`.  
   - Show user: “Refund: 2–3 business days.”

---

## 4. Abuse / edge tests

- **Wrong code 5 times** → confirmation locked for 15 minutes.  
- **Confirm when status ≠ OUT_FOR_DELIVERY** (and not legacy allowed status) → `409 Bad state`.  
- **Confirm after 7-day expiry** → rejected.  
- **Buyer calls confirm** → `403 Forbidden` (only seller can confirm).

---

## 5. Stripe Connect

- **Seller onboarding**: `POST /api/payments/stripe/connect/onboard` (auth) → returns `{ url }`. Open in browser to complete Express onboarding.
- **Status**: `GET /api/payments/stripe/connect/status` (auth) → `canAcceptPayouts`, `stripe_onboarding_status`, etc.
- Sellers **cannot accept orders** until `canAcceptPayouts` is true.

## 6. cURL examples

Replace `BASE`, `TOKEN`, `ORDER_ID`, `LISTING_ID` as needed.

```bash
BASE="http://localhost:4001/api"
TOKEN="Bearer <your_jwt>"

# Create COD order
curl -s -X POST "$BASE/orders/create" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"listingId": 1, "qty": 1, "paymentMethod": "COD", "address": {"line1": "123 Test St", "city": "Dubai", "postalCode": "00000"}}'

# Create Stripe order (get clientSecret for PaymentSheet)
curl -s -X POST "$BASE/orders/create" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"listingId": 1, "qty": 1, "paymentMethod": "STRIPE", "address": {"line1": "123 Test St", "city": "Dubai", "postalCode": "00000"}}'

# Buyer: get order (includes confirmation hint and escrow_status for Stripe)
curl -s "$BASE/orders/$ORDER_ID" -H "Authorization: $TOKEN"

# Buyer: get confirmation state (canReveal, maskedCode, revealHint; code + qrPayload if canReveal)
curl -s "$BASE/orders/$ORDER_ID/confirmation" -H "Authorization: $TOKEN"

# Seller: accept
curl -s -X PATCH "$BASE/seller/orders/$ORDER_ID/accept" -H "Authorization: $TOKEN"

# Seller: mark packed
curl -s -X PATCH "$BASE/seller/orders/$ORDER_ID/status" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "PACKED"}'

# Seller: out for delivery
curl -s -X PATCH "$BASE/seller/orders/$ORDER_ID/status" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "OUT_FOR_DELIVERY"}'

# Seller: confirm delivery (7-digit)
curl -s -X POST "$BASE/orders/$ORDER_ID/confirm-delivery" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "1234567"}'

# Admin: list orders
curl -s "$BASE/admin/orders?status=PLACED" -H "Authorization: $TOKEN"

# Admin: list disputes
curl -s "$BASE/admin/disputes?status=OPEN" -H "Authorization: $TOKEN"

# Admin: resolve dispute (refund)
curl -s -X POST "$BASE/admin/disputes/1/resolve" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "REFUND"}'

# Seller: Stripe Connect onboarding URL
curl -s -X POST "$BASE/payments/stripe/connect/onboard" -H "Authorization: $TOKEN"

# Seller: Connect status
curl -s "$BASE/payments/stripe/connect/status" -H "Authorization: $TOKEN"
```

---

## 7. Status flow (FSM)

- **COD / Stripe:**  
  `PLACED` → `ACCEPTED` → `PACKED` → `OUT_FOR_DELIVERY` → (confirm) → `COMPLETED`  
- **Terminal:** `CANCELLED`, `REFUNDED`, `DISPUTED` (admin resolve → `REFUNDED` or `COMPLETED`).
- **Stripe:** Payment captured at checkout; funds held (escrow) until delivery confirmation, then released to seller (wallet or Stripe Connect).

---

## 8. Payout retries

Orders with `payout_status=PENDING` (e.g. transfer failed) can be retried by calling `ordersService.retryPendingPayouts()`. Run periodically (e.g. every 10 min) via a cron or admin trigger.

## 9. DB checks

- **order_confirmations:** one row per order; `used_at` set when seller confirms.  
- **order_payments:** Stripe orders only; `capture_status`, `escrow_status` (NONE → CAPTURED+HELD → RELEASED or REFUNDED).  
- **orders.status:** follows FSM above.
