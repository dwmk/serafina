import { motion } from 'framer-motion';
import { SpinnerGap, Check, Wrench, Brain, ArrowsClockwise } from '@phosphor-icons/react';

const TOOL_LABELS = {
  get_current_weather: 'Weather Lookup',
  get_current_time: 'Time Check',
  get_ip_info: 'Network Info',
  get_browser_info: 'Browser Info',
  get_crypto_price: 'Crypto Price',
  web_search: 'Web Search',
  wikipedia_search: 'Wikipedia',
  generate_image: 'Image Generation',
  analyze_image: 'Vision Analysis',
};

export function ToolProgressDisplay({ progress }) {
  if (progress.phase === 'thinking') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <SpinnerGap size={16} className="animate-spin" style={{ color: 'var(--tool-muted)' }} />
        <span style={{ color: 'var(--tool-muted)' }}>Thinking…</span>
      </div>
    );
  }

  if (progress.phase === 'thinking_after_tools') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Brain size={16} style={{ color: 'var(--tool-accent)' }} />
        <span style={{ color: 'var(--tool-muted)' }}>Formulating response…</span>
      </div>
    );
  }

  if (progress.phase === 'processing_results') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <ArrowsClockwise size={16} className="animate-spin" style={{ color: 'var(--tool-accent)' }} />
        <span style={{ color: 'var(--tool-muted)' }}>Processing results…</span>
      </div>
    );
  }

  if (progress.phase === 'calling_tools' && progress.tools) {
    return (
      <div className="flex flex-col gap-1.5 min-w-[180px]">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--tool-header)' }}>
          <Wrench size={12} />
          <span>Using Tools</span>
        </div>
        {progress.tools.map((tool, i) => {
          const label = TOOL_LABELS[tool.name] || tool.name;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2 text-sm"
            >
              {tool.status === 'done' ? (
                <Check size={14} weight="bold" style={{ color: 'var(--tool-done)' }} />
              ) : tool.status === 'executing' ? (
                <SpinnerGap size={14} className="animate-spin" style={{ color: 'var(--tool-accent)' }} />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-current opacity-30" style={{ color: 'var(--tool-muted)' }} />
              )}
              <span style={{ color: tool.status === 'done' ? 'var(--tool-done)' : tool.status === 'executing' ? 'var(--tool-accent)' : 'var(--tool-muted)' }}>
                {label}
              </span>
              {tool.status === 'executing' && (
                <span className="text-xs italic" style={{ color: 'var(--tool-muted)' }}>running…</span>
              )}
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--tool-bounce)', animationDelay: '0ms' }} />
      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--tool-bounce)', animationDelay: '150ms' }} />
      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--tool-bounce)', animationDelay: '300ms' }} />
    </div>
  );
}
