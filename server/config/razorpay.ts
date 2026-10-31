import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

export const razorpay = keyId && keySecret
  ? new Razorpay({ key_id: keyId, key_secret: keySecret })
  : null;

export const razorpayKeyId = keyId;

export const createIdempotentRefund = async (paymentId: string, amount: number, idempotencyKey: string) => {
  if (!keyId || !keySecret) throw new Error("Razorpay is not configured");
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      "X-Refund-Idempotency": idempotencyKey,
    },
    body: JSON.stringify({ amount }),
  });
  const refund = await response.json() as { id?: string; payment_id?: string; status?: string; amount?: number };
  if (!response.ok || !refund.id || !refund.payment_id || typeof refund.amount !== "number" || !refund.status) throw new Error("Razorpay refund request failed");
  return { id: refund.id, payment_id: refund.payment_id, amount: refund.amount, status: refund.status };
};
