import { useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import StatusBar from './StatusBar';
import CommandPalette from './CommandPalette';
import AiPanel from './AiPanel';
import { useTheme } from '../lib/ThemeContext';
import { AiPanelProvider } from '../lib/AiPanelContext';

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const { isDark, toggle: toggleDarkMode } = useTheme();

  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);
  const openSearch = useCallback(() => setCommandPaletteOpen(true), []);
  const closeSearch = useCallback(() => setCommandPaletteOpen(false), []);
  const toggleAiPanel = useCallback(() => setAiPanelOpen((o) => !o), []);
  const openAiPanel = useCallback(() => setAiPanelOpen(true), []);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Cmd+K / Ctrl+K: toggle command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
      // Cmd+B / Ctrl+B: toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed((c) => !c);
      }
      // Escape: close modals/panels
      if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen]);

  // Collapse AI panel on narrow screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1279px)');
    const handler = (e) => setAiPanelOpen(!e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <AiPanelProvider onOpenPanel={openAiPanel}>
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <TopBar
        onOpenSearch={openSearch}
        darkMode={isDark}
        onToggleDarkMode={toggleDarkMode}
        aiPanelOpen={aiPanelOpen}
        onToggleAiPanel={toggleAiPanel}
      />

      {/* Main area: sidebar + content + AI panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>

        {/* AI Panel */}
        {aiPanelOpen && <AiPanel />}
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Command palette overlay */}
      <CommandPalette open={commandPaletteOpen} onClose={closeSearch} />
    </div>
    </AiPanelProvider>
  );
}
