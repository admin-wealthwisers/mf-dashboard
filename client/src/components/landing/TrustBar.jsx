import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, viewportOnce } from '../../lib/landingAnimations';
import AnimatedCounter from './AnimatedCounter';

const stats = [
  { value: '15,000+', label: 'Mutual Fund Schemes' },
  { value: '1.6 Cr+', label: 'NAV Data Points' },
  { value: '20 Years', label: 'Historical Data' },
  { value: '500+', label: 'Funds with Holdings' },
];

export default function TrustBar() {
  return (
    <section className="bg-gray-50 border-y border-gray-100 py-14">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={fadeUp}>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600 font-mono">
                <AnimatedCounter value={stat.value} />
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
