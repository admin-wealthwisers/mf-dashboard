import { HelpCircle } from 'lucide-react';

/**
 * Contextual help button — opens help for a specific section.
 * In Electron: opens a new window via IPC.
 * In web: opens the help page with anchor in a new tab.
 */
export default function HelpButton({ helpId, className = '' }) {
  const handleClick = () => {
    if (window.electronAPI?.openHelpWindow) {
      window.electronAPI.openHelpWindow(helpId);
    } else {
      window.open(`/help#${helpId}`, '_blank');
    }
  };

  return (
    <button
      onClick={handleClick}
      title="Help"
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-muted hover:text-accent hover:bg-accent/10 transition-colors ${className}`}
    >
      <HelpCircle className="w-4 h-4" />
    </button>
  );
}
