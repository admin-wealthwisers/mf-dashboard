/**
 * PaywallScreen — full-screen blocker for expired trial / free users.
 * Must pay or logout. No dismiss, no navigation.
 */
import { useState } from 'react';
import { Crown, Check, Sparkles, LogOut } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

const proFeatures = [
  'AI-powered fund analysis — 20 queries/day',
  'Unlimited ECAS PDF portfolio import',
  'Advanced portfolio analysis & tracking',
  'Category comparison (top 3 auto-select)',
  'Compare 3+ funds with overlap matrix',
  'Fund DNA deep-dive radar analysis',
];

export default function PaywallScreen() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpgradePro = async () => {
    setLoading(true);
    setError(null);

    try {
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        credentials: 'include',
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        setError(err.error || 'Failed to create order');
        setLoading(false);
        return;
      }

      const { data } = await orderRes.json();

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Intelligent MF Analytics',
        description: 'Pro Plan — Monthly Subscription',
        order_id: data.orderId,
        prefill: {
          name: data.userName,
          email: data.userEmail,
        },
        theme: { color: '#10B981' },
        handler: async (response) => {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (verifyRes.ok) {
              window.location.reload();
            } else {
              const err = await verifyRes.json();
              setError(err.error || 'Payment verification failed');
            }
          } catch {
            setError('Payment verification failed. Contact connect@mfanalytics.in');
          }
          setLoading(false);
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setError('Failed to initiate payment. Try again.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-positive/10 mb-4">
              <Crown className="w-7 h-7 text-positive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Your trial has ended
            </h1>
            <p className="text-sm text-muted">
              Hi {user?.name?.split(' ')[0] || 'there'}, your 7-day free trial is over.
              Subscribe to Pro to continue using all features.
            </p>
          </div>

          {/* Features */}
          <div className="bg-background rounded-lg p-4 mb-6">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Pro plan includes:
            </p>
            <ul className="space-y-2">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-positive mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Price */}
          <div className="text-center mb-6">
            <span className="text-3xl font-bold text-foreground">₹299</span>
            <span className="text-muted ml-1">/month + GST</span>
          </div>

          {error && (
            <div className="bg-negative/10 text-negative text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          {/* Actions */}
          <button
            onClick={handleUpgradePro}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-positive text-white rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-colors mb-3"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Processing...' : 'Subscribe to Pro — ₹299/month'}
          </button>

          <p className="text-[11px] text-center text-muted mb-4">
            UPI, cards, net banking accepted via Razorpay. Cancel anytime.
          </p>

          <div className="border-t border-border pt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>

        {/* Footer links */}
        <div className="flex justify-center gap-4 mt-4 text-xs text-muted">
          <a href="/legal/terms" className="hover:text-foreground">Terms</a>
          <a href="/legal/refund" className="hover:text-foreground">Refund Policy</a>
          <a href="/legal/contact" className="hover:text-foreground">Contact</a>
        </div>
      </div>
    </div>
  );
}
