export default function Footer() {
  return (
    <footer className="border-t border-gray-100 py-12 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="" className="w-7 h-7 object-contain" />
              <span className="font-mono font-bold text-sm">Intelligent Market Analytics</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Institutional-grade mutual fund analytics platform for Indian investors. AI-powered insights for smarter decisions.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-gray-900">Product</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#features" className="hover:text-gray-700 transition-colors">Features</a></li>
              <li><a href="#editions" className="hover:text-gray-700 transition-colors">Editions</a></li>
              <li><a href="#how-it-works" className="hover:text-gray-700 transition-colors">How It Works</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-gray-900">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="/legal/terms" className="hover:text-gray-700 transition-colors">Terms of Service</a></li>
              <li><a href="/legal/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</a></li>
              <li><a href="/legal/refund" className="hover:text-gray-700 transition-colors">Refund Policy</a></li>
              <li><a href="/legal/contact" className="hover:text-gray-700 transition-colors">Contact Us</a></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-gray-900">Connect</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="mailto:support@mfanalytics.in" className="hover:text-gray-700 transition-colors">support@mfanalytics.in</a></li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                Built in India
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} WealthWisers Fintech Pvt. Ltd. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 text-center">
            Data sourced from MFAPI (api.mfapi.in) &middot; Not SEBI registered &middot; For informational purposes only
          </p>
        </div>
      </div>
    </footer>
  );
}
