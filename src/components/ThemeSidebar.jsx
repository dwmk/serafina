// src/components/ThemeSidebar.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, X, Check } from '@phosphor-icons/react';
import { THEMES } from '../lib/themes';

export function ThemeSidebar({ activeTheme, onSelect, open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="theme-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'var(--overlay-bg)' }}
          />

          <motion.aside
            key="theme-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 h-full w-72 z-50 flex flex-col border-l themed-theme-sidebar shadow-2xl"
          >
            <div className="p-4 flex items-center gap-3 border-b border-inherit">
          <Palette size={20} className="themed-sidebar-text" />
          <span className="font-bold text-lg themed-sidebar-text">Themes</span>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg themed-sidebar-hover themed-sidebar-secondary transition-colors"
            title="Close theme sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {THEMES.map((theme) => {
            const isActive = theme.id === activeTheme;
            return (
              <button
                key={theme.id}
                onClick={() => onSelect(theme.id)}
                className={`w-full text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden themed-theme-card ${
                  isActive ? 'themed-theme-card-active scale-[1.02] shadow-md' : 'hover:border-zinc-300 dark:hover:border-zinc-600 scale-100'
                }`}
                style={isActive ? { borderColor: 'var(--accent, #3b82f6)' } : {}}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm themed-theme-card-text">
                      {theme.name}
                    </span>
                    {isActive && (
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center shadow-sm" 
                        style={{ background: 'var(--accent, #3b82f6)' }}
                      >
                        <Check size={12} weight="bold" color="#fff" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {theme.swatches.map((color, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border border-black/10 shadow-xs"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-inherit text-xs themed-sidebar-muted text-center">
          More customizations on{' '}
          <a
            href="https://muxai.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="themed-link underline hover:opacity-80 transition-opacity font-medium"
          >
            MuxAI
          </a>
        </div>
      </motion.aside>
    </>
  )}
</AnimatePresence>
);
}
