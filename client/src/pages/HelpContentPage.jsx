import { useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import helpContent from '../data/helpContent';

/**
 * Standalone help content page for Electron popup windows.
 * Renders without AppLayout (no sidebar/topbar).
 * Reads helpId from ?id= query parameter.
 */
export default function HelpContentPage() {
  const [searchParams] = useSearchParams();
  const helpId = searchParams.get('id') || 'getting-started';
  const content = helpContent[helpId];

  if (!content) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
        <p className="text-muted">Help topic not found: {helpId}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8 max-w-3xl mx-auto">
      {/* Title */}
      <h1 className="font-mono font-bold text-xl mb-6 pb-3 border-b border-border">
        {content.title}
      </h1>

      {/* Sections */}
      <div className="space-y-6">
        {content.sections.map((sub, i) => (
          <div key={i}>
            <h2 className="font-medium text-sm text-foreground mb-2 flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-accent" />
              {sub.heading}
            </h2>
            <div
              className="text-sm text-muted/90 leading-relaxed space-y-2 pl-5 [&_strong]:text-foreground [&_strong]:font-medium [&_kbd]:px-1.5 [&_kbd]:py-0.5 [&_kbd]:text-xs [&_kbd]:bg-background [&_kbd]:border [&_kbd]:border-border [&_kbd]:rounded [&_kbd]:font-mono [&_kbd]:text-foreground"
              dangerouslySetInnerHTML={{ __html: sub.body.replace(/\n/g, '<br/>') }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
