/**
 * Shared framer-motion animation variants for landing page sections
 */

// Fade up from below — used by most section headings and content
export const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

// Stagger children container — wraps grids of cards
export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

// Scale in — used for pricing cards, feature cards
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

// Fade in from left
export const fadeLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

// Fade in from right
export const fadeRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

// Default viewport settings for whileInView
export const viewportOnce = { once: true, amount: 0.2 };
