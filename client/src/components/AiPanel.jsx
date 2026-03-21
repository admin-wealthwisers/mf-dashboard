import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Trash2, User, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import Plot from 'react-plotly.js';
import { defaultConfig, COLORS } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';
import { useAiPanel } from '../lib/AiPanelContext';

const SUGGESTIONS = [
  'Compare large cap funds',
  'Show sector exposure for top 5 funds',
  'Which funds have highest banking exposure?',
  'Show drawdown analysis for HDFC Flexi Cap',
];

let messageId = 0;

export default function AiPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const aiPanel = useAiPanel();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isStreaming) return;

      const userMsg = {
        id: ++messageId,
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsStreaming(true);
      setStreamingContent('');

      try {
        // Build history from last few messages
        const history = messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch('/api/agent/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: text.trim(), history }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Request failed' }));

          // Feature gate — show upgrade modal
          if (response.status === 403 || response.status === 429) {
            window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { feature: 'AI Chat' } }));
          }

          setMessages((prev) => [
            ...prev,
            {
              id: ++messageId,
              role: 'assistant',
              content: err.message || err.error || 'Something went wrong',
              timestamp: new Date(),
            },
          ]);
          setIsStreaming(false);
          return;
        }

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';
        let finalResult = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);
              if (event.type === 'token') {
                accumulated += event.content;
                // Don't show raw JSON tokens — show a thinking indicator instead
                setStreamingContent('Analyzing your question...');
              } else if (event.type === 'result') {
                finalResult = event;
              } else if (event.type === 'error') {
                finalResult = { text: event.content, sql: null, data: null, chartSpec: null };
              }
            } catch {
              // skip
            }
          }
        }

        // Add final assistant message — clean text only, no raw JSON
        let cleanText = finalResult?.text || 'Here are the results.';
        // Strip any embedded JSON from the text
        cleanText = cleanText.replace(/\{[\s\S]*"sql"[\s\S]*\}$/m, '').trim();
        // Remove leading wrapper text like "Here is the query..."
        cleanText = cleanText.replace(/^.*?(?:query|JSON|response).*?:\s*$/m, '').trim();
        if (!cleanText) cleanText = 'Here are the results based on your query.';

        const assistantMsg = {
          id: ++messageId,
          role: 'assistant',
          content: cleanText,
          sql: finalResult?.sql || null,
          data: finalResult?.data || null,
          chartSpec: finalResult?.chartSpec || null,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: ++messageId,
            role: 'assistant',
            content: `Error: ${err.message}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
      }
    },
    [isStreaming, messages]
  );

  // Register sendMessage with AiPanelContext for external triggers
  useEffect(() => {
    if (aiPanel?.registerSendMessage) {
      aiPanel.registerSendMessage(sendMessage);
    }
  }, [aiPanel, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingContent('');
  };

  return (
    <aside className="w-[360px] bg-card border-l border-border flex flex-col shrink-0">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-mono font-bold text-foreground">AI Assistant</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="p-1.5 text-muted hover:text-negative transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Sparkles className="w-8 h-8 text-muted/30" />
            <p className="text-xs text-muted text-center px-4 leading-relaxed">
              Ask questions about your mutual fund data in natural language
            </p>
            {/* Suggested chips */}
            <div className="flex flex-wrap gap-1.5 justify-center px-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-[10px] px-2.5 py-1.5 bg-background border border-border-subtle rounded-full text-muted hover:text-foreground hover:border-accent/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="mr-8">
            <div className="flex items-start gap-2">
              <Sparkles className="w-3 h-3 text-accent mt-1 shrink-0" />
              <div className="bg-background border border-border-subtle rounded-lg px-3 py-2 text-xs text-foreground/90 leading-relaxed min-w-0">
                {streamingContent ? (
                  <span className="whitespace-pre-wrap break-words">{streamingContent}</span>
                ) : (
                  <TypingIndicator />
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border-subtle px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your funds..."
            disabled={isStreaming}
            className="flex-1 bg-background border border-border-subtle rounded px-3 py-2 text-xs text-foreground placeholder:text-muted outline-none focus:border-accent/50 disabled:opacity-50 transition-colors"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="p-2 text-accent hover:text-accent/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      className={isUser ? 'ml-8' : 'mr-4'}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-start gap-2">
        {!isUser && <Sparkles className="w-3 h-3 text-accent mt-1 shrink-0" />}
        <div className="min-w-0 flex-1">
          <div
            className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
              isUser
                ? 'bg-accent/10 border border-accent/20 text-foreground'
                : 'bg-background border border-border-subtle text-foreground/90'
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>

          {/* Data table — show only when no chart (chart is more visual) */}
          {message.data && message.data.length > 0 && !message.chartSpec && <DataTable data={message.data} />}

          {/* Chart */}
          {message.chartSpec && <InlineChart spec={message.chartSpec} />}

          {/* Timestamp */}
          <p className="text-[9px] text-muted/50 mt-1 px-1">
            {message.timestamp?.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        {isUser && <User className="w-3 h-3 text-accent mt-1 shrink-0" />}
      </div>
    </motion.div>
  );
}

function SqlBlock({ sql }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1 text-[10px] text-muted hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        SQL Query
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.pre
            className="mt-1 p-2 bg-background rounded text-[10px] font-mono text-muted overflow-x-auto"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {sql}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}

function DataTable({ data }) {
  const columns = Object.keys(data[0]);
  const displayRows = data.slice(0, 10);
  const remaining = data.length - displayRows.length;

  return (
    <div className="mt-2 overflow-x-auto rounded border border-border-subtle">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-background">
            {columns.map((col) => (
              <th key={col} className="px-2 py-1.5 text-left text-[10px] text-muted font-medium uppercase whitespace-nowrap">
                {col.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr key={i} className="border-t border-border-subtle/30">
              {columns.map((col) => (
                <td key={col} className="px-2 py-1.5 font-data text-foreground whitespace-nowrap">
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {remaining > 0 && (
        <div className="px-2 py-1 text-[10px] text-muted bg-background/50 border-t border-border-subtle/30">
          and {remaining} more rows...
        </div>
      )}
    </div>
  );
}

function formatCell(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }
  const str = String(value);
  return str.length > 40 ? str.slice(0, 38) + '...' : str;
}

function InlineChart({ spec }) {
  const [fullscreen, setFullscreen] = useState(false);
  const chartLayout = useChartLayout();
  if (!spec?.traces) return null;

  const layout = {
    ...chartLayout,
    margin: fullscreen ? { t: 40, r: 30, b: 60, l: 70 } : { t: 30, r: 16, b: 40, l: 50 },
    ...spec.layout,
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: chartLayout.font,
  };

  // Apply theme colors to traces
  const traces = spec.traces.map((trace, i) => ({
    ...trace,
    marker: { color: COLORS[i % COLORS.length], ...trace.marker },
  }));

  return (
    <>
      <div className="mt-2 rounded border border-border-subtle overflow-hidden relative" style={{ height: fullscreen ? undefined : 220 }}>
        <button
          onClick={() => setFullscreen(true)}
          className="absolute top-1.5 right-1.5 z-10 p-1 bg-background/80 rounded hover:bg-background text-muted hover:text-foreground transition-colors"
          title="View fullscreen"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
        <Plot
          data={traces}
          layout={layout}
          config={defaultConfig}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {fullscreen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFullscreen(false)}
            />
            <motion.div
              className="fixed inset-4 z-50 bg-card border border-border rounded-lg overflow-hidden flex flex-col"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
                <h3 className="font-mono text-sm text-foreground">{spec.layout?.title || 'Chart'}</h3>
                <button
                  onClick={() => setFullscreen(false)}
                  className="p-1.5 text-muted hover:text-foreground transition-colors"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <Plot
                  data={traces}
                  layout={{ ...layout, title: undefined }}
                  config={defaultConfig}
                  useResizeHandler
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 bg-accent/60 rounded-full"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}
