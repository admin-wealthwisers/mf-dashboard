import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { fadeUp, staggerContainer, viewportOnce } from '../../lib/landingAnimations';

const faqs = [
  {
    q: 'Is it really free? What\u2019s the catch?',
    a: 'There is no catch. The web version of Intelligent MF Analytics is completely free — no credit card, no trial period, no feature gates. We believe every investor deserves access to institutional-grade analytics.',
  },
  {
    q: 'What data sources do you use?',
    a: 'We source NAV data from MFAPI (api.mfapi.in), which aggregates from AMFI (Association of Mutual Funds in India). Data is updated daily at 6 AM IST. Holdings data comes from published fund factsheets.',
  },
  {
    q: 'Why is ECAS portfolio import not available on the web version?',
    a: 'ECAS/CAMS/KFintech statements contain sensitive personal financial data. In compliance with India\u2019s Digital Personal Data Protection (DPDP) Act, we have made a deliberate decision not to store any client financial data on our servers. The ECAS import feature is fully built and will be available exclusively in our self-hosted edition, where your data stays entirely on your own machine.',
  },
  {
    q: 'What is the self-hosted edition?',
    a: 'It\u2019s a lightweight, standalone version of the platform that you can deploy on your own personal server or even your laptop. It includes all web features plus ECAS import, client portfolio management, and other features involving sensitive data. Your financial information never leaves your machine. We will also offer managed deployment support for those who need help setting it up.',
  },
  {
    q: 'Do you provide investment advice?',
    a: 'No. Intelligent MF Analytics is an informational and analytical tool only. We are not SEBI registered and do not provide investment advice. Always consult a qualified financial advisor before making investment decisions.',
  },
  {
    q: 'How does the AI Chat work?',
    a: 'Our AI Chat converts your natural language questions into SQL queries against our fund database. It can generate charts, tables, and comparisons automatically. The AI analyzes real data — it does not hallucinate fund information.',
  },
  {
    q: 'Is my data secure?',
    a: 'We use Google OAuth for authentication — we never see or store your password. The web version does not store any sensitive financial data. Portfolio tracking uses only fund scheme codes and unit counts, not personal financial statements. For full privacy, our upcoming self-hosted edition keeps everything on your own infrastructure.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-100">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-600">Everything you need to know before getting started.</p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="space-y-3"
        >
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-sm pr-4">{faq.q}</span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 text-sm text-gray-600 leading-relaxed">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
