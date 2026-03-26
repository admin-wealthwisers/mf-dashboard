import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

/**
 * Animated counter that counts up when scrolled into view.
 * Handles values like "15,000+", "1.6 Cr+", "20 Years", "500+"
 */
export default function AnimatedCounter({ value, duration = 1.5 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!isInView) return;

    // Parse the numeric part and suffix
    const match = value.match(/^([\d,.]+)\s*(.*)/);
    if (!match) {
      setDisplay(value);
      return;
    }

    const numStr = match[1].replace(/,/g, '');
    const suffix = match[2] || '';
    const target = parseFloat(numStr);
    const isDecimal = numStr.includes('.');
    const startTime = performance.now();
    const durationMs = duration * 1000;

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      if (isDecimal) {
        setDisplay(`${current.toFixed(1)} ${suffix}`);
      } else {
        const formatted = Math.round(current).toLocaleString('en-IN');
        setDisplay(`${formatted}${suffix ? ' ' + suffix : ''}`);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Final exact value
        setDisplay(value);
      }
    }

    requestAnimationFrame(animate);
  }, [isInView, value, duration]);

  return <span ref={ref}>{display}</span>;
}
