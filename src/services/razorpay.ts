import crypto from 'node:crypto';
import {
  BadRequestException,
  HttpException,
} from '../middlewares/error.middleware';

function credentials() {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret)
    throw new HttpException(503, 'Razorpay is not configured');
  return { key, secret };
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): void {
  if (
    typeof orderId !== 'string' ||
    !/^order_[A-Za-z0-9]+$/.test(orderId) ||
    typeof paymentId !== 'string' ||
    !/^pay_[A-Za-z0-9]+$/.test(paymentId) ||
    typeof signature !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    throw new BadRequestException(
      'Complete Razorpay payment proof is required',
    );
  }
  const expected = crypto
    .createHmac('sha256', credentials().secret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  if (!crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'))) {
    throw new BadRequestException('Invalid Razorpay signature');
  }
}

async function request(path: string, body?: object): Promise<any> {
  const { key, secret } = credentials();
  let response: globalThis.Response;
  try {
    response = await fetch(`https://api.razorpay.com/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new HttpException(502, 'Razorpay is unavailable; retry later');
  }
  if (!response.ok) throw new HttpException(502, 'Razorpay request failed');
  return response.json();
}

export function money(
  value: unknown,
  name = 'Amount',
  allowZero = false,
): number {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    String(value).trim() === ''
  ) {
    throw new BadRequestException(`${name} must be a valid monetary amount`);
  }
  const amount = Number(value);
  const paise = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) ||
    !Number.isSafeInteger(paise) ||
    amount < 0 ||
    (!allowZero && amount === 0) ||
    Math.abs(amount * 100 - paise) > 0.00001
  )
    throw new BadRequestException(
      `${name} must be positive with at most two decimal places`,
    );
  return paise / 100;
}

export async function createOrder(amount: number, receipt: string) {
  const paise = Math.round(money(amount) * 100);
  const order = await request('orders', {
    amount: paise,
    currency: 'INR',
    receipt,
  });
  if (
    !/^order_[A-Za-z0-9]+$/.test(order.id) ||
    order.amount !== paise ||
    order.currency !== 'INR'
  ) {
    throw new HttpException(502, 'Invalid Razorpay order response');
  }
  return order;
}

export async function verifyCapturedPayment(
  orderId: string,
  paymentId: string,
  signature: string,
  amount: number,
) {
  verifyPaymentSignature(orderId, paymentId, signature);
  const payment = await request(`payments/${encodeURIComponent(paymentId)}`);
  if (
    payment.id !== paymentId ||
    payment.order_id !== orderId ||
    payment.status !== 'captured' ||
    payment.currency !== 'INR' ||
    payment.amount !== Math.round(money(amount) * 100)
  ) {
    throw new BadRequestException(
      'Payment is not captured or does not match this order',
    );
  }
}
