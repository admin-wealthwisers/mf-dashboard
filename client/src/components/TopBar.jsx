import { Moon, Sun, Command, PanelRightOpen, PanelRightClose } from 'lucide-react';

export default function TopBar({ onOpenSearch, darkMode, onToggleDarkMode, aiPanelOpen, onToggleAiPanel }) {
  return (
    <header className="h-12 bg-card border-b border-border flex items-center justify-between px-4">
      {/* Left — App name */}
      <div className="font-mono font-bold text-sm tracking-wide text-foreground">
        Intelligent MF Analytics
      </div>

      {/* Center — Search trigger */}
      <button
        onClick={onOpenSearch}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted bg-background border border-border rounded hover:border-muted transition-colors"
      >
        <Command className="w-3 h-3" />
        <span>Search schemes...</span>
        <kbd className="font-mono text-[10px] bg-card px-1.5 py-0.5 rounded-sm border border-border-subtle">
          ⌘K
        </kbd>
      </button>

      {/* Right — Controls */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-muted font-mono">
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
