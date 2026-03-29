import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { trackEvent } from '../../lib/analytics';

export default function Navbar({ login }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogin = () => {
    trackEvent('cta_click', 'navbar', 'sign_in');
    login();
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Intelligent Market Analytics" className="w-8 h-8 object-contain" />
          <span className="font-mono font-bold text-lg">Intelligent Market Analytics</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-3">
          <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors">How It Works</a>
          <a href="#editions" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors">Editions</a>
          <a
            href="/explore"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Explore Funds
          </a>
          <button
            onClick={handleLogin}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors"
          >
            Sign in
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 text-gray-600 hover:text-gray-900"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm text-gray-600 py-2">Features</a>
              <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="text-sm text-gray-600 py-2">How It Works</a>
              <a href="#editions" onClick={() => setMobileOpen(false)} className="text-sm text-gray-600 py-2">Editions</a>
              <a
                href="/explore"
                onClick={() => setMobileOpen(false)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors text-center block"
              >
                Explore Funds
              </a>
              <button
                onClick={() => { setMobileOpen(false); handleLogin(); }}
                className="text-sm text-gray-600 py-2"
              >
                Sign in with Google
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
