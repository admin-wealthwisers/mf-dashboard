import { Activity, BarChart3, Brain, Shield, TrendingUp, Zap, Check, ChevronRight, Star, PieChart, GitCompareArrows, Search } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

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
    icon: Shield,
    title: 'ECAS Portfolio Import',
    desc: 'Upload your CAMS/KFintech statement PDF and get your entire portfolio analyzed in seconds — no manual entry.',
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
];

const freeFeatures = [
  'Dashboard with market overview',
  'Explore 15,000+ mutual fund schemes',
  'Fund Scorecard with Intelligence Score',
  'Side-by-side fund comparison (2 funds)',
  'NAV growth & drawdown charts',
  'Help documentation',
];

const trialFeatures = [
  'Everything in Free, plus:',
  'AI Chat — 10 queries per day',
  '1 ECAS PDF import',
  'Portfolio analysis & tracking',
  'Compare 3+ funds with overlap matrix',
  'Category comparison (top 3 auto-select)',
  'Fund DNA deep-dive radar',
];

const proFeatures = [
  'Everything in Trial, plus:',
  'AI Chat — 20 queries per day',
  'Unlimited ECAS PDF imports',
  'Priority support',
];

const stats = [
  { value: '15,000+', label: 'Mutual Fund Schemes' },
  { value: '1.6 Cr+', label: 'NAV Data Points' },
  { value: '20 Years', label: 'Historical Data' },
  { value: '500+', label: 'Funds with Holdings' },
];

export default function LandingPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ─── Navbar ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Intelligent MF Analytics" className="w-8 h-8 object-contain" />
            <span className="font-mono font-bold text-lg">Intelligent MF Analytics</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#features" className="hidden sm:inline text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Features</a>
            <a href="#pricing" className="hidden sm:inline text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Pricing</a>
            <button
              onClick={login}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            Powered by AI &middot; 15,000+ Mutual Funds &middot; Real-time Data
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
            Institutional-Grade{' '}
            <span className="text-emerald-600">Mutual Fund</span>{' '}
            Analytics
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Deep quantitative analysis, AI-powered insights, and portfolio intelligence for Indian mutual funds.
            Built for investors who need more than basic NAV charts.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={login}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
            >
              Get Started Free
              <ChevronRight className="w-4 h-4" />
            </button>
            <a
              href="#features"
              className="flex items-center gap-2 px-6 py-3 text-gray-700 hover:text-gray-900 font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              See Features
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Free forever for basic features. No credit card required.
          </p>
        </div>

        {/* Hero Dashboard Image */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="rounded-xl overflow-hidden shadow-2xl shadow-gray-900/20 border border-gray-200">
            <img
              src="/hero_dashboard.png"
              alt="Intelligent MF Analytics Dashboard — Mutual Fund Analytics"
              className="w-full"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ───────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 font-mono">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ───────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            From basic NAV tracking to AI-powered portfolio analysis — tools built for serious mutual fund investors.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="p-6 rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                <feature.icon className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-600">Start free. Try premium features for 7 days. Upgrade when you're ready.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h3 className="text-lg font-semibold mb-1">Free</h3>
              <p className="text-sm text-gray-500 mb-6">Explore and basic analysis</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">₹0</span>
                <span className="text-gray-500 ml-1">/forever</span>
              </div>
              <button
                onClick={login}
                className="w-full py-2.5 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors mb-8"
              >
                Get Started
              </button>
              <ul className="space-y-3">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trial Plan */}
            <div className="bg-white rounded-2xl border-2 border-blue-500 p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
                No credit card needed
              </div>
              <h3 className="text-lg font-semibold mb-1">Trial</h3>
              <p className="text-sm text-gray-500 mb-6">7 days of premium features</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">₹0</span>
                <span className="text-gray-500 ml-1">/7 days</span>
              </div>
              <button
                onClick={login}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors mb-8"
              >
                Start Free Trial
              </button>
              <ul className="space-y-3">
                {trialFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="bg-white rounded-2xl border-2 border-emerald-500 p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded-full">
                Best value
              </div>
              <h3 className="text-lg font-semibold mb-1">Pro</h3>
              <p className="text-sm text-gray-500 mb-6">For serious investors and advisors</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">₹299</span>
                <span className="text-gray-500 ml-1">/month + GST</span>
              </div>
              <button
                onClick={login}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors mb-8"
              >
                Upgrade to Pro
              </button>
              <ul className="space-y-3">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to analyze smarter?
          </h2>
          <p className="text-gray-600 mb-8">
            Join investors who use AI-powered analytics to make better mutual fund decisions.
          </p>
          <button
            onClick={login}
            className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Star className="w-4 h-4" />
            Sign in with Google — It&apos;s Free
          </button>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-6 h-6 object-contain" />
            <span className="font-mono font-semibold text-sm">Intelligent MF Analytics</span>
          </div>
          <p className="text-xs text-gray-400">
            Data sourced from MFAPI (api.mfapi.in) &middot; Not SEBI registered &middot; For informational purposes only
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <a href="/legal/terms" className="hover:text-gray-600">Terms</a>
            <a href="/legal/privacy" className="hover:text-gray-600">Privacy</a>
            <a href="/legal/refund" className="hover:text-gray-600">Refunds</a>
            <a href="/legal/contact" className="hover:text-gray-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
