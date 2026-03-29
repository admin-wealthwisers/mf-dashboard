/**
 * Upgrade Modal — shown when user hits a feature gate.
 * Handles trial start and Razorpay checkout.
 */
import { useState } from 'react';
import { X, Sparkles, Check, Zap, Crown } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

const proFeatures = [
  'AI-powered fund analysis — 20 queries/day',
  'Unlimited ECAS PDF portfolio import',
  'Advanced portfolio analysis',
  'Category comparison (top 3 auto-select)',
  'Compare 3+ funds with overlap matrix',
  'Fund DNA deep-dive radar analysis',
];

export default function UpgradeModal({ isOpen, onClose, feature }) {
  const { user, tier, startTrial, login, launchMode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || launchMode) return null;

  const handleStartTrial = async () => {
    setLoading(true);
    setError(null);
    const ok = await startTrial();
    setLoading(false);
    if (ok) {
      onClose();
      window.location.reload(); // Refresh to pick up new tier
    } else {
      setError('Trial already used or unavailable.');
    }
  };

  const handleUpgradePro = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create order on backend
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

      // Open Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Intelligent Market Analytics',
        description: 'Pro Plan — Monthly Subscription',
        order_id: data.orderId,
        prefill: {
          name: data.userName,
          email: data.userEmail,
        },
        theme: {
          color: '#10B981',
        },
        handler: async (response) => {
          // Verify payment on backend
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
              onClose();
              window.location.reload(); // Refresh to pick up Pro tier
            } else {
              const err = await verifyRes.json();
              setError(err.error || 'Payment verification failed');
            }
          } catch {
            setError('Payment verification failed. Contact support.');
          }
          setLoading(false);
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError('Failed to initiate payment. Try again.');
      setLoading(false);
    }
  };

  const showTrialOption = tier === 'free' && !user?.trialInfo?.expired;
  const trialExpired = user?.trialInfo?.expired;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-positive/10 mb-3">
            <Crown className="w-6 h-6 text-positive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {feature ? `Unlock ${feature}` : 'Upgrade to Pro'}
          </h2>
          <p className="text-sm text-muted mt-1">
            {feature
              ? 'This feature requires a Pro plan or free trial.'
              : 'Get full access to all analytics features.'}
          </p>
        </div>

        {/* Features list */}
        <div className="bg-background rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Pro includes:</p>
          <ul className="space-y-2">
            {proFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-positive mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="bg-negative/10 text-negative text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {showTrialOption && (
            <button
              onClick={handleStartTrial}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              <Zap className="w-4 h-4" />
              {loading ? 'Starting...' : 'Start 7-Day Free Trial'}
            </button>
          )}

          <button
            onClick={handleUpgradePro}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-positive text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Processing...' : 'Upgrade to Pro — ₹299/month'}
          </button>

          {trialExpired && (
            <p className="text-xs text-center text-muted">
              Your free trial has expired. Upgrade to continue using Pro features.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
