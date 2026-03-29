import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const pages = {
  terms: {
    title: 'Terms & Conditions',
    lastUpdated: '21 March 2026',
    content: `
## 1. Introduction

Welcome to Intelligent Market Analytics ("we", "our", "us"), operated by Wealthwisers Securities ("Company"), accessible at mfanalytics.in. By using our platform, you agree to these Terms & Conditions.

## 2. Service Description

Intelligent Market Analytics is a mutual fund analytics platform that provides data visualization, portfolio analysis, AI-powered insights, and fund comparison tools for Indian mutual funds. Data is sourced from MFAPI (api.mfapi.in) and publicly available sources.

## 3. User Accounts

- You must sign in using a valid Google account.
- You are responsible for all activity under your account.
- We reserve the right to suspend or terminate accounts that violate these terms.

## 4. Subscription Plans

- **Free Plan**: Basic analytics features, available indefinitely at no cost.
- **Pro Plan**: Advanced features including AI Chat, ECAS Portfolio Import, and detailed fund analysis at ₹299/month plus applicable GST (18%).
- **Trial**: New users receive a 7-day free trial of Pro features.

## 5. Payments & Billing

- Payments are processed securely through Razorpay.
- Pro subscriptions are billed monthly.
- All prices are in Indian Rupees (INR) and are exclusive of GST unless stated otherwise.
- You authorize us to charge your selected payment method on a recurring monthly basis.

## 6. Cancellation & Refunds

- You may cancel your Pro subscription at any time from your account settings.
- Upon cancellation, you retain Pro access until the end of the current billing period.
- **Refund Policy**: We offer a full refund within 7 days of your first payment if you are not satisfied. Refunds for subsequent months are not available. Contact us at connect@mfanalytics.in for refund requests.
- No refunds for partial months of usage.

## 7. Disclaimer

- We are **not SEBI registered** investment advisors.
- All data and analytics are provided for **informational purposes only**.
- We do not provide investment advice, recommendations, or guarantees of returns.
- Past performance of mutual funds does not guarantee future results.
- Users should consult a qualified financial advisor before making investment decisions.

## 8. Data Accuracy

- We source data from MFAPI and other public sources. While we strive for accuracy, we do not guarantee the completeness or correctness of data.
- NAV data may be delayed by up to 24 hours.

## 9. Intellectual Property

- All content, designs, algorithms, and code on this platform are owned by Wealthwisers Securities.
- Users may not copy, reproduce, or reverse-engineer any part of the platform.

## 10. Limitation of Liability

- We are not liable for any financial losses incurred based on information provided on this platform.
- Our total liability is limited to the amount paid by the user in the preceding 3 months.

## 11. Changes to Terms

We may update these terms from time to time. Continued use of the platform constitutes acceptance of the updated terms.

## 12. Governing Law

These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Noida/Delhi NCR, India.

## 13. Contact

For questions about these terms, contact us at **connect@mfanalytics.in**.
    `,
  },

  privacy: {
    title: 'Privacy Policy',
    lastUpdated: '21 March 2026',
    content: `
## 1. Information We Collect

**Account Information**: When you sign in with Google, we receive your name, email address, and profile picture. We do not receive or store your Google password.

**Usage Data**: We collect anonymous usage data including pages visited, features used, and AI chat queries to improve our service.

**Payment Information**: Payment details are processed directly by Razorpay. We do not store your credit card, debit card, or UPI details on our servers.

**Portfolio Data**: If you upload ECAS statements or create portfolios, this data is stored securely and associated with your account.

## 2. How We Use Your Information

- To provide and maintain our analytics service
- To process payments and manage subscriptions
- To communicate important updates about your account
- To improve our platform and develop new features
- To enforce our terms of service

## 3. Data Storage & Security

- Your data is stored on secure AWS servers located in Mumbai, India.
- We use encryption in transit (HTTPS/TLS) for all communications.
- Database access is restricted and protected by authentication.
- We do not share, sell, or rent your personal information to third parties.

## 4. Third-Party Services

We use the following third-party services:
- **Google OAuth**: For authentication (governed by Google's Privacy Policy)
- **Razorpay**: For payment processing (governed by Razorpay's Privacy Policy)
- **Cloudflare**: For CDN and security (governed by Cloudflare's Privacy Policy)
- **Mistral AI**: For AI-powered analytics (queries are sent to Mistral's API)

## 5. Data Retention

- Account data is retained as long as your account is active.
- You may request deletion of your account and associated data by contacting us.
- Payment records are retained for 7 years as required by Indian tax regulations.

## 6. Your Rights

- **Access**: You can access your data through your account dashboard.
- **Correction**: Contact us to correct any inaccurate personal information.
- **Deletion**: Request account deletion by emailing connect@mfanalytics.in.
- **Portability**: You can export your portfolio data at any time.

## 7. Cookies

We use essential cookies for authentication (JWT session tokens). We do not use tracking cookies or third-party advertising cookies.

## 8. Children's Privacy

Our service is not intended for users under 18 years of age. We do not knowingly collect data from minors.

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify users of significant changes via email.

## 10. Contact

For privacy-related concerns, contact us at **connect@mfanalytics.in**.
    `,
  },

  refund: {
    title: 'Refund & Cancellation Policy',
    lastUpdated: '21 March 2026',
    content: `
## Cancellation Policy

- You can cancel your Pro subscription at any time.
- Cancellation takes effect at the end of your current billing period.
- After cancellation, you will retain access to Pro features until the billing period ends.
- Your account will automatically revert to the Free plan after the billing period.
- You can re-subscribe at any time.

## Refund Policy

**First-Time Subscribers:**
- If you are not satisfied with the Pro plan, you may request a **full refund within 7 days** of your first payment.
- Contact us at connect@mfanalytics.in with your registered email to initiate a refund.

**Subsequent Months:**
- Refunds are **not available** for subsequent monthly charges after the first month.
- We recommend cancelling your subscription before the next billing cycle if you do not wish to continue.

**Refund Processing:**
- Approved refunds will be processed within 5-7 business days.
- Refunds will be credited to the original payment method.

**Non-Refundable:**
- Partial month usage is not refundable.
- If your account is suspended for terms violation, no refund will be provided.

## Free Trial

- New users receive a 7-day free trial of Pro features.
- No payment is required to start the trial.
- The trial automatically expires after 7 days — you will not be charged.
- You can upgrade to Pro at any time during or after the trial.

## Contact

For refund requests or cancellation assistance, email **connect@mfanalytics.in**.
    `,
  },

  contact: {
    title: 'Contact Us',
    lastUpdated: '21 March 2026',
    content: `
## Get in Touch

We'd love to hear from you. Whether you have a question about features, pricing, or anything else, our team is ready to help.

**Email:** connect@mfanalytics.in

**Business Name:** Wealthwisers Securities

**Address:** Noida, Uttar Pradesh, India

## Support Hours

Monday to Friday: 10:00 AM - 6:00 PM IST

We typically respond to emails within 24 hours on business days.

## Feedback

Have suggestions for new features or improvements? Email us at **connect@mfanalytics.in**. We read every message.

## Report an Issue

If you encounter a bug or technical issue, please email **connect@mfanalytics.in** with:
- A description of the issue
- The page/feature where it occurred
- Your browser and device information
- Screenshots if possible
    `,
  },
};

export default function LegalPage() {
  const { page } = useParams();
  const content = pages[page];

  if (!content) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold">Page not found</p>
          <Link to="/" className="text-emerald-600 text-sm mt-2 inline-block">← Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navbar */}
      <nav className="border-b border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {content.lastUpdated}</p>

        <div className="prose prose-gray prose-sm max-w-none">
          {content.content.split('\n').map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return null;
            if (trimmed.startsWith('## ')) {
              return <h2 key={i} className="text-lg font-semibold mt-8 mb-3">{trimmed.slice(3)}</h2>;
            }
            if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
              return <p key={i} className="font-semibold mt-4">{trimmed.slice(2, -2)}</p>;
            }
            if (trimmed.startsWith('- ')) {
              return (
                <p key={i} className="pl-4 py-0.5 text-gray-700">
                  • {trimmed.slice(2).split('**').map((part, j) =>
                    j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                  )}
                </p>
              );
            }
            return (
              <p key={i} className="text-gray-700 leading-relaxed my-2">
                {trimmed.split('**').map((part, j) =>
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                )}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
