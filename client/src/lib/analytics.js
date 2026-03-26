/**
 * Google Analytics GA4 utility
 * Replace G-XXXXXXXXXX with your actual Measurement ID
 */

export function trackPageView(path) {
  if (window.gtag) {
    window.gtag('event', 'page_view', { page_path: path });
  }
}

export function trackEvent(action, category, label) {
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
    });
  }
}
