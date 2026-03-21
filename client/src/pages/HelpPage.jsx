import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Rocket,
  LayoutDashboard,
  Search,
  GitCompareArrows,
  Briefcase,
  Award,
  FileText,
  Settings,
  MessageSquare,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import helpContent from '../data/helpContent';

const iconMap = {
  Rocket,
  LayoutDashboard,
  Search,
  GitCompareArrows,
  Briefcase,
  Award,
  FileText,
  Settings,
  MessageSquare,
  CreditCard,
};

const sectionOrder = [
  'getting-started',
  'plans-billing',
  'dashboard',
  'explore',
  'compare',
  'portfolio',
  'scorecard',
  'scheme-detail',
  'ai-chat',
  'admin',
];

export default function HelpPage() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('getting-started');

  // Scroll to anchor on load or hash change
  useEffect(() => {
    const hash = location.hash?.replace('#', '');
    if (hash && helpContent[hash]) {
      setActiveSection(hash);
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );

    for (const id of sectionOrder) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex gap-6 max-w-7xl">
      {/* Table of Contents — sticky sidebar */}
      <nav className="hidden lg:block w-56 shrink-0 sticky top-0 self-start max-h-[calc(100vh-80px)] overflow-y-auto pr-2">
        <h2 className="font-mono font-bold text-xs uppercase tracking-wider text-muted mb-3 px-2">
          Help Topics
        </h2>
        <ul className="space-y-0.5">
          {sectionOrder.map((id) => {
            const { title, icon } = helpContent[id];
            const Icon = iconMap[icon] || FileText;
            const isActive = activeSection === id;
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveSection(id);
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-muted hover:text-foreground hover:bg-card'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{title}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-12 pb-20">
        {/* Page Header */}
        <div>
          <h1 className="font-mono font-bold text-xl text-foreground mb-1">
            Help & Documentation
          </h1>
          <p className="text-sm text-muted">
            Everything you need to know about Intelligent MF Analytics
          </p>
        </div>

        {/* Sections */}
        {sectionOrder.map((id) => {
          const { title, icon, sections } = helpContent[id];
          const Icon = iconMap[icon] || FileText;

          return (
            <section key={id} id={id} className="scroll-mt-6">
              {/* Section Title */}
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-border">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10">
                  <Icon className="w-4 h-4 text-accent" />
                </div>
                <h2 className="font-mono font-bold text-lg text-foreground">
                  {title}
                </h2>
              </div>

              {/* Subsections */}
              <div className="space-y-6">
                {sections.map((sub, i) => (
                  <div key={i}>
                    <h3 className="font-medium text-sm text-foreground mb-2 flex items-center gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-accent" />
                      {sub.heading}
                    </h3>
                    <div
                      className="text-sm text-muted/90 leading-relaxed space-y-2 pl-5 [&_strong]:text-foreground [&_strong]:font-medium [&_kbd]:px-1.5 [&_kbd]:py-0.5 [&_kbd]:text-xs [&_kbd]:bg-background [&_kbd]:border [&_kbd]:border-border [&_kbd]:rounded [&_kbd]:font-mono [&_kbd]:text-foreground"
                      dangerouslySetInnerHTML={{ __html: sub.body.replace(/\n/g, '<br/>') }}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
