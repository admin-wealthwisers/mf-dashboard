import { Moon, Sun, Command, PanelRightOpen, PanelRightClose, Crown, Clock, Zap, Menu } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

function PlanBadge() {
  const { user, tier, isPro, isTrial, launchMode, login } = useAuth();
  const trialInfo = user?.trialInfo;

  const showUpgrade = () => {
    window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { feature: null } }));
  };

  // Not logged in — show sign-in prompt
  if (!user) {
    return (
      <button
        onClick={login}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors"
      >
        <span className="text-[11px] font-semibold text-accent">Sign in</span>
      </button>
    );
  }

  // Launch mode: show special badge, no upgrade CTA
  if (launchMode) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20">
        <Zap className="w-3 h-3 text-accent" />
        <span className="text-[11px] font-semibold text-accent">Launch Access</span>
      </div>
    );
  }

  if (isPro) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-positive/10 border border-positive/20">
        <Crown className="w-3 h-3 text-positive" />
        <span className="text-[11px] font-semibold text-positive">Pro</span>
      </div>
    );
  }

  if (isTrial && trialInfo) {
    const daysLeft = trialInfo.daysLeft;
    const progress = Math.max(0, Math.min(1, (7 - daysLeft) / 7));
    const isUrgent = daysLeft <= 2;
    const barColor = isUrgent ? 'bg-negative' : 'bg-amber-500';
    const textColor = isUrgent ? 'text-negative' : 'text-amber-600 dark:text-amber-400';
    const borderColor = isUrgent ? 'border-negative/30' : 'border-amber-500/30';
    const bgColor = isUrgent ? 'bg-negative/10' : 'bg-amber-500/10';

    return (
      <button
        onClick={showUpgrade}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${bgColor} border ${borderColor} hover:opacity-80 transition-opacity`}
        title="Click to upgrade to Pro"
      >
        <Clock className={`w-3 h-3 ${textColor}`} />
        <span className={`text-[11px] font-semibold ${textColor}`}>
          Trial · {daysLeft}d left
        </span>
        {/* Mini progress bar */}
        <div className="w-10 h-1.5 bg-background/50 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </button>
    );
  }

  // Free / expired trial
  return (
    <button
      onClick={showUpgrade}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/10 border border-border hover:border-positive/50 hover:bg-positive/5 transition-colors"
      title="Upgrade to Pro"
    >
      <span className="text-[11px] font-semibold text-muted">Free</span>
      <span className="text-[10px] text-positive font-medium">Upgrade</span>
    </button>
  );
}

export default function TopBar({ onOpenSearch, darkMode, onToggleDarkMode, aiPanelOpen, onToggleAiPanel, onToggleMobileSidebar }) {
  return (
    <header className="h-12 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4">
      {/* Left — Hamburger (mobile) + App name */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMobileSidebar}
          className="p-1.5 text-muted hover:text-foreground transition-colors lg:hidden"
          title="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="font-mono font-bold text-sm tracking-wide text-foreground hidden sm:block">
          Intelligent Market Analytics
        </div>
        <div className="font-mono font-bold text-sm tracking-wide text-foreground sm:hidden">
          Market Analytics
        </div>

        {/* Stock Analytics toggle */}
        <label className="flex items-center gap-1.5 ml-3 cursor-pointer select-none" title="Toggle Stock Analytics">
          <span className="text-[10px] text-muted hidden sm:inline">Stocks</span>
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={typeof window !== 'undefined' && window.location.hostname.startsWith('stocks.')}
              onChange={(e) => {
                const isStocks = e.target.checked;
                const currentPath = window.location.pathname;
                if (isStocks) {
                  window.location.href = `https://stocks.mfanalytics.in${currentPath.startsWith('/stocks') ? currentPath : '/stocks/explore'}`;
                } else {
                  window.location.href = `https://mfanalytics.in${currentPath.startsWith('/stocks') ? '/explore' : currentPath}`;
                }
              }}
            />
            <div className="w-8 h-4 bg-border rounded-full peer-checked:bg-accent transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
          </div>
        </label>
      </div>

      {/* Center — Search trigger */}
      <button
        onClick={onOpenSearch}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted bg-background border border-border rounded hover:border-muted transition-colors"
      >
        <Command className="w-3 h-3" />
        <span className="hidden sm:inline">Search schemes...</span>
        <span className="sm:hidden">Search...</span>
        <kbd className="font-mono text-[10px] bg-card px-1.5 py-0.5 rounded-sm border border-border-subtle hidden sm:inline">
          ⌘K
        </kbd>
      </button>

      {/* Right — Controls */}
      <div className="flex items-center gap-3">
        <PlanBadge />
        <span className="text-[11px] text-muted font-mono hidden sm:inline">
          {new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <button
          onClick={onToggleAiPanel}
          className="p-1.5 text-muted hover:text-foreground transition-colors"
          title={aiPanelOpen ? 'Hide AI panel' : 'Show AI panel'}
        >
          {aiPanelOpen ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={onToggleDarkMode}
          className="p-1.5 text-muted hover:text-foreground transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
