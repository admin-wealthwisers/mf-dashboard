import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Search,
  GitCompareArrows,
  Award,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Activity,
  LogOut,
  LogIn,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/explore', label: 'Explore', icon: Search },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows },
  { to: '/scorecard', label: 'Scorecard', icon: Award },
];

const stockNavItems = [
  { to: '/stocks/dashboard', label: 'Market', icon: BarChart3 },
  { to: '/stocks/explore', label: 'Stocks', icon: TrendingUp },
  { to: '/stocks/compare', label: 'Compare', icon: GitCompareArrows },
  { to: '/stocks/scorecard', label: 'Scorecard', icon: Award },
];

export default function Sidebar({ collapsed, onToggle, onNavClick }) {
  const { user, isAdmin, isDev, logout, login } = useAuth();
  const isStocksDomain = typeof window !== 'undefined' && window.location.hostname.startsWith('stocks.');

  const bottomItems = [
    { to: '/help', label: 'Help', icon: HelpCircle },
    ...(isAdmin && isDev ? [{ to: '/admin', label: 'Admin', icon: Settings }] : []),
  ];
  return (
    <motion.aside
      className="h-full bg-sidebar border-r border-border flex flex-col overflow-hidden"
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {/* Logo area */}
      <div className="h-12 flex items-center gap-2 px-4 border-b border-border-subtle shrink-0">
        <img src="/logo.png" alt="Intelligent MF Analytics" className="w-5 h-5 object-contain shrink-0" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 flex flex-col gap-0.5 overflow-y-auto">
        {/* MUTUAL FUNDS section heading */}
        {!collapsed && (
          <div className="px-4 pt-1 pb-1">
            <span className="text-[9px] uppercase tracking-widest text-muted/50 font-mono">Mutual Funds</span>
          </div>
        )}
        {collapsed && <div className="border-t border-border-subtle my-1 mx-3" />}

        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative ${
                isActive
                  ? 'bg-sidebar-active text-foreground'
                  : 'text-muted hover:text-foreground hover:bg-sidebar-active/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-accent rounded-r-sm" />
                )}
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && (
                  <motion.span
                    className="truncate"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 }}
                  >
                    {label}
                  </motion.span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* STOCKS section — only on stocks.mfanalytics.in */}
        {isStocksDomain && (
          <>
            {!collapsed && (
              <div className="px-4 pt-3 pb-1">
                <span className="text-[9px] uppercase tracking-widest text-muted/50 font-mono">Stocks</span>
              </div>
            )}
            {collapsed && <div className="border-t border-border-subtle my-1 mx-3" />}

            {stockNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative ${
                    isActive
                      ? 'bg-sidebar-active text-foreground'
                      : 'text-muted hover:text-foreground hover:bg-sidebar-active/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-accent rounded-r-sm" />
                    )}
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && (
                      <motion.span
                        className="truncate"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.05 }}
                      >
                        {label}
                      </motion.span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom nav */}
      <div className="py-2 border-t border-border-subtle flex flex-col gap-0.5">
        {bottomItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 text-sm transition-colors relative ${
                isActive
                  ? 'bg-sidebar-active text-foreground'
                  : 'text-muted hover:text-foreground hover:bg-sidebar-active/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-accent rounded-r-sm" />
                )}
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && (
                  <motion.span
                    className="truncate"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 }}
                  >
                    {label}
                  </motion.span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* User + Logout */}
      {user ? (
        <div className="px-3 py-2 border-t border-border-subtle flex items-center gap-2">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold shrink-0">
              {user.name?.[0] || user.email?.[0] || '?'}
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-foreground truncate">{user.name || user.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="p-1 text-muted hover:text-negative transition-colors shrink-0"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="px-3 py-2 border-t border-border-subtle">
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent/10 border border-accent/20 rounded-md hover:bg-accent/20 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-accent" />
            {!collapsed && <span className="text-[11px] font-semibold text-accent">Sign in for full access</span>}
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="h-10 flex items-center justify-center border-t border-border-subtle text-muted hover:text-foreground transition-colors shrink-0"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </motion.aside>
  );
}
