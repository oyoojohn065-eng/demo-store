// M-Pesa Daraja API client (Safaricom).
// Supports sandbox and production via MPESA_ENV. Reads all config from env.

const BASE_URLS = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
};

export function getMpesaConfig() {
  const env = (process.env.MPESA_ENV || "sandbox").toLowerCase();
  return {
    env,
    baseUrl: BASE_URLS[env] || BASE_URLS.sandbox,
    consumerKey: process.env.MPESA_CONSUMER_KEY || "",
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
    shortcode: process.env.MPESA_SHORTCODE || "",
    passkey: process.env.MPESA_PASSKEY || "",
    callbackUrl: process.env.MPESA_CALLBACK_URL || "",
    transactionType:
      process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline",
  };
}

export function isMpesaConfigured() {
  const c = getMpesaConfig();
  return Boolean(
    c.consumerKey && c.consumerSecret && c.shortcode && c.passkey && c.callbackUrl
  );
}

// Normalise a Kenyan phone number to the 2547XXXXXXXX / 2541XXXXXXXX format.
export function normalizePhone(input) {
  if (!input) return null;
  let digits = String(input).replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "254" + digits.slice(1);
  else if (digits.startsWith("7") || digits.startsWith("1"))
    digits = "254" + digits;
  else if (digits.startsWith("254")) {
    // already correct
  } else if (digits.startsWith("+254")) digits = digits.slice(1);
  if (!/^254(7|1)\d{8}$/.test(digits)) return null;
  return digits;
}

// Build the yyyyMMddHHmmss timestamp Daraja expects.
function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds())
  );
}

async function getAccessToken() {
  const c = getMpesaConfig();
  const auth = Buffer.from(`${c.consumerKey}:${c.consumerSecret}`).toString(
    "base64"
  );
  const res = await fetch(
    `${c.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` }, cache: "no-store" }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`M-Pesa auth failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

/**
 * Initiate an STK Push. `amount` is in whole KES (integer).
 * Returns { ok, checkoutRequestId, merchantRequestId, customerMessage } or throws.
 */
export async function initiateStkPush({ phone, amount, accountRef, description }) {
  const c = getMpesaConfig();
  const ts = timestamp();
  const password = Buffer.from(`${c.shortcode}${c.passkey}${ts}`).toString(
    "base64"
  );
  const token = await getAccessToken();

  const payload = {
    BusinessShortCode: c.shortcode,
    Password: password,
    Timestamp: ts,
    TransactionType: c.transactionType,
    Amount: Math.max(1, Math.round(amount)),
    PartyA: phone,
    PartyB: c.shortcode,
    PhoneNumber: phone,
    CallBackURL: c.callbackUrl,
    AccountReference: (accountRef || "Order").slice(0, 12),
    TransactionDesc: (description || "Payment").slice(0, 13),
  };

  const res = await fetch(`${c.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok || data.ResponseCode !== "0") {
    throw new Error(
      data.errorMessage ||
        data.ResponseDescription ||
        `STK push failed (${res.status}).`
    );
  }

  return {
    ok: true,
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
    customerMessage: data.CustomerMessage,
  };
}
