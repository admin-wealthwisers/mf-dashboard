import { motion } from 'framer-motion';
import { BarChart3, Brain, PieChart, GitCompareArrows, Search, Shield, Server, Lock } from 'lucide-react';
import { fadeUp, staggerContainer, viewportOnce } from '../../lib/landingAnimations';

const features = [
  {
    icon: BarChart3,
    title: 'Intelligence Score',
    desc: 'Proprietary composite scoring combining performance, consistency, risk, and diversification across 15,000+ mutual funds.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Chat',
    desc: 'Ask questions in plain English. Get instant answers with auto-generated charts from our natural language SQL engine.',
  },
  {
    icon: PieChart,
    title: 'Fund DNA Profiling',
    desc: '6-dimension radar analysis: Return, Consistency, Risk Control, Diversification, Downside Protection, Recovery Speed.',
  },
  {
    icon: GitCompareArrows,
    title: 'Side-by-Side Compare',
    desc: 'Compare funds head-to-head with overlap analysis, sector exposure, and NAV growth overlay charts.',
  },
  {
    icon: Search,
    title: 'Deep Analytics',
    desc: 'Rolling returns, drawdown analysis, Sharpe/Sortino ratios, max drawdown periods — institutional-grade metrics.',
  },
  {
    icon: Shield,
    title: 'Portfolio Tracking',
    desc: 'Add funds manually or via CSV upload. Track your portfolio valuation, sector exposure, and fund overlap in real time.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={fadeUp}
        className="text-center mb-16"
      >
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          From basic NAV tracking to AI-powered portfolio analysis — tools built for serious mutual fund investors. All free.
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {features.map((feature) => (
          <motion.div
            key={feature.title}
            variants={fadeUp}
            className="p-6 rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all group bg-white"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors"
            >
              <feature.icon className="w-5 h-5 text-emerald-600" />
            </motion.div>
            <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ECAS / Data Privacy Notice */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={fadeUp}
        className="mt-16 max-w-4xl mx-auto"
      >
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-1">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-3">ECAS Portfolio Import &amp; Data Privacy</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Our ECAS/CAMS/KFintech statement import engine is fully built and ready. However, we have made a deliberate
                decision to <strong>not offer it in the web version</strong> to uphold the highest standards of data privacy
                and compliance with India&apos;s Digital Personal Data Protection (DPDP) Act. Your financial statements contain
                sensitive personal data that we believe should never leave your control.
              </p>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-blue-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Server className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Coming Soon: Self-Hosted Edition</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    We are developing a lightweight, self-hosted version that you can deploy on your own personal server
                    or even your laptop. Your financial data stays entirely on your machine — fully secure, fully private.
                    ECAS import, client portfolio management, and other features involving sensitive personal data will be
                    available exclusively in this edition. Managed deployment support will also be offered.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
