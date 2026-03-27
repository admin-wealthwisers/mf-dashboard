import { motion } from 'framer-motion';
import { ChevronRight, Zap, Lock, Brain, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../../lib/analytics';

const words = ['Institutional-Grade', 'Mutual Fund', 'Analytics'];

export default function Hero({ login }) {
  const navigate = useNavigate();
  const handleExplore = () => {
    trackEvent('cta_click', 'hero', 'explore_funds');
    navigate('/explore');
  };

  return (
    <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-blue-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.08)_0%,_transparent_60%)]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-8 border border-emerald-100"
          >
            <Zap className="w-3.5 h-3.5" />
            Free &amp; Open Access &middot; 15,000+ Mutual Funds &middot; AI-Powered
          </motion.div>

          {/* Animated headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
            {words.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
                className={`inline-block mr-3 ${i === 1 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent' : ''}`}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10"
          >
            Deep quantitative analysis, AI-powered insights, and portfolio intelligence for Indian mutual funds.
            Completely free. No credit card, no paywall, no catches.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              onClick={handleExplore}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-600/25"
            >
              Explore 15,000+ Funds
              <ChevronRight className="w-4 h-4" />
            </motion.button>
            <a
              href="/scorecard/118989"
              className="flex items-center gap-2 px-6 py-3 text-gray-700 hover:text-gray-900 font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              See Live Scorecard →
            </a>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs text-gray-400"
          >
            <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> No sign-up fees, ever</span>
            <span className="flex items-center gap-1.5"><BarChart3 className="w-3 h-3" /> 15,000+ schemes</span>
            <span className="flex items-center gap-1.5"><Brain className="w-3 h-3" /> AI-powered analysis</span>
          </motion.div>
        </div>

        {/* Hero dashboard image */}
        <motion.div
          initial={{ opacity: 0, y: 60, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
          className="mt-16 max-w-5xl mx-auto perspective-1000"
        >
          <div className="rounded-xl overflow-hidden shadow-2xl shadow-emerald-900/10 border border-gray-200 bg-gray-900">
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 border-b border-gray-700">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <div className="flex-1 mx-4">
                <div className="bg-gray-700 rounded px-3 py-1 text-[10px] text-gray-400 max-w-xs mx-auto text-center">
                  mfanalytics.in
                </div>
              </div>
            </div>
            <img
              src="/hero_dashboard.png"
              alt="Intelligent MF Analytics Dashboard showing fund analysis, charts, and AI insights"
              className="w-full"
              loading="eager"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
