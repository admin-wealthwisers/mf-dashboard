import { motion } from 'framer-motion';
import { Star, ArrowRight } from 'lucide-react';
import { fadeUp, viewportOnce } from '../../lib/landingAnimations';
import { trackEvent } from '../../lib/analytics';

export default function FinalCTA({ login }) {
  const handleCTA = () => {
    trackEvent('cta_click', 'final_cta', 'bottom_signup');
    login();
  };

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-700" />

      {/* Floating dots */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-white/10"
          style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
          animate={{
            y: [0, -15, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        />
      ))}

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={fadeUp}
        className="relative max-w-3xl mx-auto text-center"
      >
        <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
          Ready to analyze smarter?
        </h2>
        <p className="text-emerald-100 mb-8 text-lg">
          Join investors who use AI-powered analytics to make better mutual fund decisions. Completely free.
        </p>
        <motion.button
          onClick={handleCTA}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-emerald-700 font-semibold rounded-lg hover:bg-emerald-50 transition-colors shadow-lg"
        >
          <Star className="w-4 h-4" />
          Get Started — It&apos;s Free
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </section>
  );
}
