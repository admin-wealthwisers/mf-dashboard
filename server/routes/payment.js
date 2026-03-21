/**
 * Razorpay Payment Routes
 *
 * Flow:
 * 1. User clicks "Upgrade to Pro" → frontend calls POST /api/payment/create-order
 * 2. Server creates Razorpay order → returns order_id + key_id
 * 3. Frontend opens Razorpay checkout with order_id
 * 4. User completes payment → Razorpay redirects with payment details
 * 5. Frontend calls POST /api/payment/verify with payment details
 * 6. Server verifies signature → upgrades user to Pro
 * 7. Razorpay also sends webhook → double-verification
 */
import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';

const router = Router();

// Razorpay config
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const PRO_AMOUNT = 29900; // ₹299 in paise
const PRO_CURRENCY = 'INR';

// Prepared statements
const updateUserPro = db.prepare(`
  UPDATE users SET tier = 'pro', subscription_status = 'active',
  subscription_end = datetime('now', '+31 days'), subscription_id = ?
  WHERE email = ?
`);

const insertPayment = db.prepare(`
  INSERT OR REPLACE INTO payments (payment_id, email, amount, currency, status, razorpay_order_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getUser = db.prepare('SELECT * FROM users WHERE email = ?');

/**
 * Create a Razorpay order for Pro subscription
 */
router.post('/payment/create-order', async (req, res) => {
  const token = req.cookies?.['mf-token'];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const jwt = (await import('jsonwebtoken')).default;
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, secret);
    const user = getUser.get(decoded.email);
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.tier === 'pro' && user.subscription_status === 'active') {
      return res.status(400).json({ error: 'Already on Pro plan' });
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    // Create order via Razorpay API
    const orderData = {
      amount: PRO_AMOUNT,
      currency: PRO_CURRENCY,
      receipt: `pro_${decoded.email}_${Date.now()}`,
      notes: {
        email: decoded.email,
        plan: 'pro_monthly',
      },
    };

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      console.error('Razorpay order creation failed:', err);
      return res.status(502).json({ error: 'Failed to create payment order' });
    }

    const order = await orderRes.json();

    res.json({
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: RAZORPAY_KEY_ID,
        userName: user.name,
        userEmail: user.email,
      },
    });
  } catch (err) {
    console.error('Create order error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Verify payment after Razorpay checkout completes
 */
router.post('/payment/verify', async (req, res) => {
  const token = req.cookies?.['mf-token'];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const jwt = (await import('jsonwebtoken')).default;
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, secret);

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Payment signature mismatch');
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Payment verified — upgrade user to Pro
    updateUserPro.run(razorpay_payment_id, decoded.email);

    // Record payment
    insertPayment.run(
      razorpay_payment_id,
      decoded.email,
      PRO_AMOUNT,
      PRO_CURRENCY,
      'captured',
      razorpay_order_id
    );

    res.json({
      data: {
        success: true,
        tier: 'pro',
        message: 'Payment successful! You are now a Pro user.',
      },
    });
  } catch (err) {
    console.error('Payment verify error:', err.message);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

/**
 * Razorpay Webhook — backup verification
 * Set this URL in Razorpay Dashboard → Webhooks: https://mfanalytics.in/api/payment/webhook
 */
router.post('/payment/webhook', (req, res) => {
  try {
    const webhookSecret = RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Webhook signature mismatch');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const email = payment.notes?.email;
      const orderId = payment.order_id;

      if (email) {
        // Upgrade user
        updateUserPro.run(payment.id, email);

        // Record payment
        insertPayment.run(
          payment.id,
          email,
          payment.amount,
          payment.currency,
          'captured',
          orderId
        );

        console.log(`Webhook: ${email} upgraded to Pro via payment ${payment.id}`);
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Get Razorpay key ID (public — needed by frontend for checkout)
 */
router.get('/payment/config', (req, res) => {
  res.json({
    data: {
      keyId: RAZORPAY_KEY_ID || '',
      amount: PRO_AMOUNT,
      currency: PRO_CURRENCY,
      planName: 'Pro Monthly',
      planDescription: 'Intelligent MF Analytics Pro — ₹299/month',
    },
  });
});

export default router;
