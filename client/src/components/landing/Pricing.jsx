import { motion } from 'framer-motion';
import { Check, Globe, Server, X } from 'lucide-react';
import { fadeUp, scaleIn, staggerContainer, viewportOnce } from '../../lib/landingAnimations';
import { trackEvent } from '../../lib/analytics';

const webFeatures = [
  { text: 'Dashboard, Explore, Scorecard, Compare', included: true },
  { text: 'AI-Powered Chat', included: true },
  { text: 'Fund DNA deep-dive radar', included: true },
  { text: 'Category comparison & overlap analysis', included: true },
  { text: 'Portfolio tracking (manual + CSV)', included: true },
  { text: 'ECAS/CAMS statement import', included: false, note: 'Privacy — see below' },
  { text: 'Client portfolio management', included: false, note: 'Self-hosted only' },
];

const selfHostedFeatures = [
  { text: 'Everything in the Web version', included: true },
  { text: 'ECAS/CAMS/KFintech PDF import', included: true },
  { text: 'Client portfolio management', included: true },
  { text: 'Data stays on your own machine', included: true },
  { text: 'DPDP compliant by design', included: true },
  { text: 'Managed deployment support', included: true },
  { text: 'Runs on a laptop or personal server', included: true },
];

export default function Pricing({ login }) {
  const handleCTA = () => {
    trackEvent('cta_click', 'editions', 'web_get_started');
    login();
  };

  return (
    <section id="editions" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Two Editions, One Mission</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Powerful analytics for everyone. Choose the edition that fits your data privacy requirements.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        >
          {/* Web Edition */}
          <motion.div variants={scaleIn} className="bg-white rounded-2xl border-2 border-emerald-500 p-8 relative shadow-lg shadow-emerald-500/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded-full">
              Available Now
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Globe className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Web Edition</h3>
                <p className="text-xs text-gray-500">mfanalytics.in</p>
              </div>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-emerald-600">Free</span>
              <span className="text-gray-400 ml-2 text-sm">forever</span>
            </div>
            <motion.button
              onClick={handleCTA}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors mb-8"
            >
              Get Started — It&apos;s Free
            </motion.button>
            <ul className="space-y-3">
              {webFeatures.map((f) => (
                <li key={f.text} className="flex items-start gap-2 text-sm">
                  {f.included ? (
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                  )}
                  <span className={f.included ? 'text-gray-700' : 'text-gray-400'}>
                    {f.text}
                    {f.note && <span className="text-xs text-gray-400 ml-1">({f.note})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Self-Hosted Edition */}
          <motion.div variants={scaleIn} className="bg-white rounded-2xl border-2 border-blue-500 p-8 relative shadow-lg shadow-blue-500/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
              Coming Soon
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Server className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Self-Hosted Edition</h3>
                <p className="text-xs text-gray-500">Your server, your data</p>
              </div>
            </div>
            <div className="mb-6">
              <span className="text-2xl font-bold text-gray-400">Details coming soon</span>
            </div>
            <div className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium text-sm text-center mb-8 border border-blue-100">
              Join Waitlist &rarr; support@mfanalytics.in
            </div>
            <ul className="space-y-3">
              {selfHostedFeatures.map((f) => (
                <li key={f.text} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-gray-700">{f.text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
