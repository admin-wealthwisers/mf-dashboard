import { motion } from 'framer-motion';
import { LogIn, Search, Brain, ArrowRight } from 'lucide-react';
import { fadeUp, staggerContainer, viewportOnce } from '../../lib/landingAnimations';

const steps = [
  {
    icon: LogIn,
    num: '1',
    title: 'Sign In',
    desc: 'One-click Google sign-in. No passwords, no forms. Your 7-day free trial starts automatically.',
  },
  {
    icon: Search,
    num: '2',
    title: 'Explore & Analyze',
    desc: 'Browse 15,000+ schemes, compare funds side-by-side, check Intelligence Scores and Fund DNA profiles.',
  },
  {
    icon: Brain,
    num: '3',
    title: 'Get AI Insights',
    desc: 'Ask questions in plain English. Our AI generates charts and answers instantly from real fund data.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-100">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-gray-600">Get started in under a minute. No setup, no complexity.</p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
        >
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="h-full bg-emerald-200 origin-left"
            />
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              variants={fadeUp}
              className="flex flex-col items-center text-center relative"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-5 relative z-10 border-4 border-white shadow-sm">
                <span className="text-lg font-bold text-emerald-600 font-mono">{step.num}</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
                <step.icon className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
