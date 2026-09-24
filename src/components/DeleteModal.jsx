import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash, Warning } from '@phosphor-icons/react';

export function DeleteModal({ conversation, onConfirm, onCancel }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  const HOLD_MS = 5000;
  const TICK_MS = 50;
  const INCREMENT = (TICK_MS / HOLD_MS) * 100;

  const start = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + INCREMENT;
        if (next >= 100) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setDone(true);
          setTimeout(() => onConfirm(), 300);
          return 100;
        }
        return next;
      });
    }, TICK_MS);
  }, [INCREMENT, onConfirm]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!done) setProgress(0);
  }, [done]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="border rounded-3xl max-w-sm w-full p-8 shadow-2xl text-center themed-modal"
        >
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Trash size={28} className="text-red-500" weight="duotone" />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--modal-text)' }}>Delete conversation?</h3>
          <p className="text-sm mb-1 themed-modal-muted">
            "{conversation?.title || 'New chat'}" and all its messages will be permanently deleted.
          </p>
          <p className="text-xs mb-6 flex items-center justify-center gap-1.5 themed-modal-muted">
            <Warning size={14} className="text-amber-400" />
            Hold the button below for 5 seconds to confirm
          </p>

          <button
            onPointerDown={start}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            className="relative w-full h-14 rounded-2xl border overflow-hidden select-none touch-none transition-colors themed-hold-btn"
            style={{ color: 'var(--modal-text)' }}
          >
            <div
              className="absolute inset-0 bg-red-500 origin-left"
              style={{ width: `${progress}%`, transition: progress === 0 ? 'width 0.2s ease-out' : 'none' }}
            />
            <span className="relative z-10 font-bold text-sm">
              {done ? 'Deleting...' : progress > 0 ? `Hold... ${Math.ceil((100 - progress) / 20)}s` : 'Hold to delete'}
            </span>
          </button>

          <button
            onClick={onCancel}
            className="w-full py-2 mt-3 text-sm themed-modal-muted hover:text-red-400 transition-colors"
          >
            Cancel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
