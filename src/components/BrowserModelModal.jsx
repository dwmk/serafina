// src/components/BrowserModelModal.jsx
import { motion } from 'framer-motion';
import { Cpu, X, HardDrive, ShieldCheck, Lightning, Check } from '@phosphor-icons/react';
import { BROWSER_MODELS } from '../lib/browserModels';

export function BrowserModelModal({ targetVersion, onConfirm, onCancel }) {
  const model = BROWSER_MODELS[targetVersion] || BROWSER_MODELS['v1.2-mini'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/65 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="themed-modal border rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl overflow-hidden relative"
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg themed-sidebar-hover themed-modal-muted transition-colors"
          title="Cancel"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0 shadow-inner">
            <Cpu size={26} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold themed-text">Browser-Side SLM</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-pink-500/15 text-pink-400 border border-pink-500/30">
                {targetVersion}
              </span>
            </div>
            <p className="text-xs themed-modal-muted">
              {model.name} • {model.sizeEstimate} download
            </p>
          </div>
        </div>

        {/* Informational Cards */}
        <div className="space-y-3 mb-6 text-xs sm:text-sm">
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-inherit flex items-start gap-3">
            <Lightning size={20} className="text-amber-400 shrink-0 mt-0.5" weight="fill" />
            <div>
              <div className="font-semibold themed-text">Runs Directly On Your Device</div>
              <p className="themed-modal-muted text-xs leading-relaxed mt-0.5">
                This version executes directly inside your web browser via <strong>Transformers.js</strong>, leveraging your local GPU (WebGPU) or CPU (WASM). No Ollama or remote server connection is required.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-inherit flex items-start gap-3">
            <HardDrive size={20} className="text-blue-400 shrink-0 mt-0.5" weight="fill" />
            <div>
              <div className="font-semibold themed-text">Persistent Browser Storage</div>
              <p className="themed-modal-muted text-xs leading-relaxed mt-0.5">
                Model weights ({model.sizeEstimate}) are saved once into your browser's persistent cache. You won't have to download it again on future visits.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-inherit flex items-start gap-3">
            <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" weight="fill" />
            <div>
              <div className="font-semibold themed-text">100% Private &amp; Offline Capable</div>
              <p className="themed-modal-muted text-xs leading-relaxed mt-0.5">
                All prompts, tokens, and calculations remain on your device. Once loaded, it functions fully offline.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-inherit">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium themed-sidebar-hover themed-modal-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg shadow-pink-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Check size={16} weight="bold" />
            Agree &amp; Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
