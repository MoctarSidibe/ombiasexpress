# Ombia Express — Wallet Production Integration Guide

## TL;DR — Which Architecture?

**Use the Centralized Float (Bank Escrow) model.**
Decentralized (crypto/blockchain) is the wrong choice for XAF, Gabon, and your use case.
Reasons explained below.

---

## Part 1 — Bank vs Decentralized: Clear Answer

### Why NOT Decentralized

| Problem | Detail |
|---|---|
| **XAF is not on-chain** | FCFA/XAF has no native blockchain representation. You'd need a stablecoin bridge (USDC → XAF) which adds conversion fees and complexity. |
| **BEAC regulation** | The Central Bank of Central African States (BEAC) does not recognize crypto as legal tender. You cannot legally require users to hold crypto to use your app. |
| **User friction** | Your users in Gabon use Airtel Money and Moov Money. They do not have crypto wallets. Forcing them to buy crypto = 0 adoption. |
| **Volatility risk** | Even stablecoins (USDC, USDT) fluctuate slightly vs XAF due to EUR/USD/XAF triangulation. |
| **Smart contract cost** | Gas fees on any EVM chain add cost to every micro-transaction (500 XAF ride = unusable). |

**Verdict: Decentralized is technically interesting but commercially dead for this market.**

---

### The Right Architecture: Centralized Float Model

This is exactly how **M-Pesa, Orange Money, Airtel Money** work internally.

```
USER DEPOSITS 5,000 XAF via Airtel Money
        │
        ▼
┌─────────────────────────────────────┐
│   Airtel Money API debit call        │
│   → 5,000 XAF leaves user's Airtel  │
│   → arrives in YOUR business Airtel  │
│     merchant account (the float)    │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│   YOUR DATABASE                     │
│   wallet.balance += 5000            │
│   (this is a ledger entry only)     │
└─────────────────────────────────────┘

USER PAYS DRIVER 2,000 XAF (wallet payment)
        │
        ▼
┌─────────────────────────────────────┐
│   YOUR DATABASE ONLY                │
│   rider.wallet.balance  -= 2000     │
│   driver.wallet.balance += 2000     │
│   (NO external API call needed)     │
└─────────────────────────────────────┘

DRIVER WITHDRAWS 10,000 XAF
        │
        ▼
┌─────────────────────────────────────┐
│   Airtel Money API payout call       │
│   → 10,000 XAF leaves YOUR float    │
│   → arrives in driver's Airtel      │
└─────────────────────────────────────┘
```

**Key insight:** Real money only moves on DEPOSIT and WITHDRAWAL.
Everything in between (rides, transfers, rentals) is pure accounting in your DB.
This is how every mobile money super-app works.

---

## Part 2 — The Float Account

### What is it?

A dedicated business mobile money account (Airtel Merchant, Moov Business) that holds the sum of ALL user wallet balances. At any moment:

```
SUM(wallets.balance) = float_account_balance  ±  small variance
```

### Who manages it?

You (Ombia Express) manage it. When float runs low, you top it up manually or automate it via bank transfer → mobile money.

### Float providers in Gabon

| Provider | Account Type | Contact |
|---|---|---|
| Airtel Gabon | Airtel Money Merchant | merchants@ga.airtel.com |
| Moov Africa Gabon | Moov Money Business | business@moov-africa.ga |
| BGFI Bank | Business account (for bank card top-ups) | bgfi.com/ga |
| UBA Gabon | API-ready bank account | ubagroup.com |

---

## Part 3 — APIs to Integrate

### 3.1 Airtel Money API (top-up + withdrawal)

**Base URL:** `https://openapi.airtel.africa`
**Auth:** OAuth 2.0 (client_credentials)

#### Get access token
```http
POST /auth/oauth2/token
Content-Type: application/json

{
  "client_id":     "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "grant_type":    "client_credentials"
}
```
Response: `{ "access_token": "...", "expires_in": 3600 }`

#### Collection (user pays into your float) — TOP-UP
```http
POST /merchant/v1/payments/
Authorization: Bearer {token}
X-Country: GA
X-Currency: XAF
Content-Type: application/json

{
  "reference":   "OMBIA-TOPUP-{uuid}",
  "subscriber":  { "country": "GA", "currency": "XAF", "msisdn": "241077123456" },
  "transaction": { "amount": "5000", "country": "GA", "currency": "XAF", "id": "{uuid}" }
}
```
Response: `{ "data": { "transaction": { "id": "...", "status": "TS" } } }`
Status codes: `TS` = Success, `TF` = Failed, `TP` = Pending

#### Disbursement (you pay driver from your float) — WITHDRAWAL
```http
POST /standard/v1/disbursements/
Authorization: Bearer {token}
X-Country: GA
X-Currency: XAF

{
  "reference":   "OMBIA-PAYOUT-{uuid}",
  "subscriber":  { "country": "GA", "currency": "XAF", "msisdn": "241077654321" },
  "transaction": { "amount": "10000", "country": "GA", "currency": "XAF", "id": "{uuid}" }
}
```

#### Check transaction status
```http
GET /standard/v1/payments/{transaction_id}
Authorization: Bearer {token}
X-Country: GA
```

---

### 3.2 Moov Money API (Gabon)

**Base URL:** `https://api.moov-africa.ga` *(confirm with Moov Gabon business team)*
**Auth:** API Key in header `X-API-Key: YOUR_KEY`

#### Collection (top-up)
```http
POST /v1/collect
X-API-Key: {key}
Content-Type: application/json

{
  "amount":      "5000",
  "currency":    "XAF",
  "phone":       "241066123456",
  "reference":   "OMBIA-{uuid}",
  "description": "Recharge Ombia Wallet"
}
```

#### Disbursement (withdrawal)
```http
POST /v1/disburse
X-API-Key: {key}

{
  "amount":    "10000",
  "currency":  "XAF",
  "phone":     "241066654321",
  "reference": "OMBIA-PAYOUT-{uuid}"
}
```

**Note:** Moov Africa Gabon API docs are obtained after signing a business partnership agreement.
Contact: `api-support@moov-africa.ga`

---

### 3.3 Bank Card (Stripe or CinetPay)

For international cards (Visa/Mastercard), use **CinetPay** — they support XAF and are OHADA-compliant.

**CinetPay** is the standard payment gateway for CEMAC zone (Gabon, Congo, Cameroon, Côte d'Ivoire).

```http
POST https://api-checkout.cinetpay.com/v2/payment
Content-Type: application/json

{
  "apikey":          "YOUR_CINETPAY_API_KEY",
  "site_id":         "YOUR_SITE_ID",
  "transaction_id":  "OMBIA-{uuid}",
  "amount":          5000,
  "currency":        "XAF",
  "description":     "Recharge Ombia Wallet",
  "return_url":      "https://ombia-app.com/wallet/return",
  "notify_url":      "https://your-server.com/api/wallet/cinetpay-webhook",
  "customer_name":   "Jean Dupont",
  "customer_phone":  "241077123456",
  "customer_email":  "user@example.com",
  "channels":        "ALL"
}
```

CinetPay returns a `payment_url` — redirect the user there to complete payment.

---

## Part 4 — How Your Current Code Maps to Production

Your current wallet routes already have the right structure. Here is exactly what to change per endpoint:

### `POST /api/wallet/topup` — current (simulated)
```js
// CURRENT: just updates balance directly
await wallet.update({ balance: newBalance });
```

### `POST /api/wallet/topup` — production
```js
// STEP 1: Initiate Airtel/Moov collection API call
const providerRef = await airtelAPI.collect({
    phone:     req.body.phone_or_card,
    amount:    req.body.amount,
    reference: `OMBIA-TOPUP-${uuidv4()}`,
});

// STEP 2: Create a PENDING transaction (don't credit yet)
await WalletTransaction.create({
    ...
    status:   'pending',          // <-- NOT 'completed'
    reference: providerRef.id,
    metadata:  { provider_response: providerRef }
});

// STEP 3: Return — do NOT credit balance yet
res.json({ message: 'En attente de confirmation...', reference: providerRef.id });

// STEP 4: Credit balance in WEBHOOK (see below)
```

### New: `POST /api/wallet/topup-webhook` — production only
```js
// Called by Airtel/Moov when payment is confirmed
router.post('/topup-webhook', async (req, res) => {
    const { transaction_id, status } = req.body;

    // Verify signature (Airtel sends X-Signature header)
    const sig = req.headers['x-signature'];
    const expected = crypto.createHmac('sha256', process.env.AIRTEL_WEBHOOK_SECRET)
                           .update(JSON.stringify(req.body)).digest('hex');
    if (sig !== expected) return res.status(401).end();

    const tx = await WalletTransaction.findOne({ where: { reference: transaction_id } });
    if (!tx || tx.status !== 'pending') return res.status(200).end();

    if (status === 'TS') {  // TS = Transaction Success (Airtel code)
        const wallet = await Wallet.findByPk(tx.wallet_id);
        const newBalance = parseFloat(wallet.balance) + parseFloat(tx.amount);
        await wallet.update({ balance: newBalance });
        await tx.update({ status: 'completed', balance_after: newBalance });
        // Notify user via socket: wallet.balance_updated
    } else {
        await tx.update({ status: 'failed' });
    }
    res.status(200).end();
});
```

### `POST /api/wallet/withdraw` — production
```js
// After deducting balance from DB, call Airtel disbursement:
const payout = await airtelAPI.disburse({
    phone:     req.body.account,
    amount:    req.body.amount,
    reference: `OMBIA-PAYOUT-${uuidv4()}`,
});
// Store payout reference in transaction metadata for tracking
```

### Everything else (transfer, nfc-pay, scan-pay) — NO CHANGE NEEDED
Peer-to-peer operations are pure DB operations. They do not need any payment API call.

---

## Part 5 — Production Checklist

### Legal & Regulatory (CEMAC / Gabon)

- [ ] Register Ombia Express as a legal entity in Gabon (SARL or SAS)
- [ ] Apply for **Établissement de Monnaie Électronique (EME)** license from BEAC
      *(or partner with an existing licensed EME — faster route)*
- [ ] Sign **Mobile Money Business Partner Agreement** with Airtel Gabon
- [ ] Sign **Mobile Money Business Partner Agreement** with Moov Africa Gabon
- [ ] Open dedicated **Merchant/Float accounts** with both operators
- [ ] Register with **GABAC** (financial intelligence unit) for AML compliance
- [ ] Set transaction limits per BEAC regulations:
      - Single transaction max: 1,000,000 XAF
      - Daily limit: 3,000,000 XAF
      - Monthly limit: 10,000,000 XAF (without full KYC)

### Technical

- [ ] Move `AIRTEL_CLIENT_ID`, `AIRTEL_CLIENT_SECRET`, `MOOV_API_KEY`, `CINETPAY_API_KEY` to environment variables
- [ ] Add `POST /api/wallet/topup-webhook` endpoint (Airtel + Moov callbacks)
- [ ] Add `POST /api/wallet/cinetpay-webhook` endpoint
- [ ] Change all topup transactions to `status: 'pending'` until webhook confirms
- [ ] Add Airtel OAuth token refresh logic (token expires every hour)
- [ ] Add idempotency: check `reference` before processing any webhook twice
- [ ] Enable HTTPS on your server (required by all payment APIs)
- [ ] Add rate limiting on topup/withdraw endpoints (prevent abuse)
- [ ] Implement daily float balance check: alert if float < SUM(wallet balances) * 1.1

### KYC (Know Your Customer)

Basic (< 300,000 XAF/month):
- [ ] Phone number verification (SMS OTP — already done via auth)

Full KYC (> 300,000 XAF/month):
- [ ] National ID photo upload
- [ ] Selfie verification
- [ ] Manual or automated review

---

## Part 6 — Environment Variables to Add

```env
# server/.env — add these when you have production API credentials

# Airtel Money Gabon
AIRTEL_CLIENT_ID=your_client_id
AIRTEL_CLIENT_SECRET=your_client_secret
AIRTEL_MERCHANT_MSISDN=your_airtel_business_number
AIRTEL_WEBHOOK_SECRET=your_webhook_signing_secret
AIRTEL_ENV=sandbox   # change to 'production' when live

# Moov Money Gabon
MOOV_API_KEY=your_moov_api_key
MOOV_MERCHANT_ID=your_merchant_id
MOOV_WEBHOOK_SECRET=your_moov_webhook_secret

# CinetPay (bank cards)
CINETPAY_API_KEY=your_cinetpay_key
CINETPAY_SITE_ID=your_site_id
CINETPAY_SECRET_KEY=your_secret

# Float safety threshold (alert if float drops below this %)
FLOAT_ALERT_THRESHOLD_PCT=20
```

---

## Part 7 — Recommended Partner Contacts

| What | Who | How |
|---|---|---|
| Airtel Money API (Gabon) | Airtel Africa Developer Portal | developers.airtel.africa |
| Moov Money API (Gabon) | Moov Africa Business team | business@moov-africa.ga |
| CinetPay (cards, XAF) | CinetPay Côte d'Ivoire | cinetpay.com — open account online |
| EME License / BEAC | BEAC Direction de la Réglementation | beac.int |
| KYC API (ID verification) | Smile Identity (Africa-focused) | smileidentity.com |
| SMS OTP | Africa's Talking | africastalking.com |

---

## Summary

```
TODAY (MVP)          PRODUCTION
─────────────────    ──────────────────────────────────
balance += amount    Airtel API call → pending tx → webhook confirms → balance +=
balance -= amount    Moov/Airtel disburse API → payout
DB debit/credit      No change (pure accounting, no API needed)
No webhooks          Add /topup-webhook and /cinetpay-webhook
No KYC               Add phone OTP (done) + ID upload for high-volume users
```

The code architecture is already correct.
The only production gap is replacing the direct `wallet.update({ balance })` on top-up
with an async flow: **API call → pending → webhook → confirm**.
Everything else (transfers, NFC pay, QR pay, ride payments) works in production as-is.
