// src/components/ChatInput.jsx
import { useState, useRef } from 'react';
import { 
  PaperPlaneTilt, 
  Lock, 
  LockOpen, 
  DiscordLogo, 
  Plus, 
  BracketsCurly, 
  Wrench, 
  SlidersHorizontal,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  SpinnerGap
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ACCEPTED_FILE_TYPES, parseFile, formatBytes } from '../lib/fileParser';
import { MascotPuppet } from './MascotPuppet';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_FILES = 5;

export function ChatInput({ 
  onSend, 
  disabled, 
  wifeMode, 
  onToggleWifeMode, 
  options = {},
  onOptionsChange,
  isOnline = true,
  onOpenServerModal
}) {
  const [value, setValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState([]); // [{ file, parsed, preview, parsing, error }]
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef(null);

  const isImage = (file) => file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((f) => f.size <= MAX_FILE_SIZE);
    if (validFiles.length < files.length) {
      // Silently drop oversized files — could add a toast later
    }

    const room = MAX_FILES - attachments.length;
    const toAdd = validFiles.slice(0, room);
    if (toAdd.length === 0) return;

    // Automatically enable tool calling mode when files are attached
    if (onOptionsChange && !options.toolCalling) {
      onOptionsChange({ ...options, toolCalling: true });
    }

    setParsing(true);

    // Add placeholders immediately
    const placeholders = toAdd.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file,
      preview: isImage(file) ? URL.createObjectURL(file) : null,
      parsed: null,
      parsing: true,
      error: null,
    }));
    setAttachments((prev) => [...prev, ...placeholders]);

    // Parse each file
    for (const p of placeholders) {
      try {
        const parsed = await parseFile(p.file);
        setAttachments((prev) =>
          prev.map((a) => (a.id === p.id ? { ...a, parsed, parsing: false } : a))
        );
      } catch (err) {
        setAttachments((prev) =>
          prev.map((a) => (a.id === p.id ? { ...a, parsing: false, error: String(err.message || err) } : a))
        );
      }
    }

    setParsing(false);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  const submit = (e) => {
    e.preventDefault();
    const hasText = value.trim().length > 0;
    const hasReadyAttachments = attachments.some((a) => a.parsed && !a.error);
    if ((!hasText && !hasReadyAttachments) || disabled || parsing) return;

    const readyAttachments = attachments.filter((a) => a.parsed && !a.error);
    onSend(value.trim(), readyAttachments.map((a) => a.parsed));
    setValue('');
    // Revoke object URLs
    attachments.forEach((a) => { if (a.preview) URL.revokeObjectURL(a.preview); });
    setAttachments([]);
  };

  return (
    <div className="w-full px-4 pb-4 pt-2 relative z-10">
      <form onSubmit={submit} className="relative max-w-3xl mx-auto">
        <MascotPuppet isOnline={isOnline} onOpenServerModal={onOpenServerModal} />

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        
        {/* Attachment Previews */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mb-2 overflow-hidden"
            >
              {attachments.map((att) => (
                <motion.div
                  key={att.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`relative flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-xl border themed-chip`}
                >
                  {att.preview ? (
                    <img src={att.preview} alt={att.file.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 themed-chip-icon`}>
                      <FileText size={16} className="themed-chip-text" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 max-w-[140px]">
                    <span className={`text-xs font-medium truncate themed-chip-text`}>{att.file.name}</span>
                    <span className={`text-[10px] themed-sidebar-muted`}>
                      {att.parsing ? (
                        <span className="flex items-center gap-1">
                          <SpinnerGap size={10} className="animate-spin" /> Parsing...
                        </span>
                      ) : att.error ? (
                        <span className="text-red-500">Failed</span>
                      ) : (
                        formatBytes(att.file.size)
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className={`p-0.5 rounded-full transition-colors themed-sidebar-hover themed-chip-secondary hover:text-current`}
                  >
                    <X size={14} weight="bold" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features Menu Dropdown (+ Button Popover) */}
        <AnimatePresence>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={`absolute bottom-full left-0 mb-3 w-72 p-3 border rounded-2xl shadow-2xl z-30 themed-menu`}
              >
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1">
                  Extra Capabilities
                </div>

                {/* File Attachment Option (Located ABOVE JSON Output Mode) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || attachments.length >= MAX_FILES}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors mb-1 themed-sidebar-hover disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-2">
                    <Paperclip size={18} />
                    <span>Attach Files</span>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400">
                    {attachments.length}/{MAX_FILES}
                  </span>
                </button>

                {/* Structured JSON Mode Toggle */}
                <button
                  type="button"
                  onClick={() => onOptionsChange?.({ ...options, jsonMode: !options.jsonMode })}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors mb-1 ${
                    options.jsonMode 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'themed-sidebar-hover'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BracketsCurly size={18} />
                    <span>JSON Output Mode</span>
                  </div>
                  <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-current">
                    {options.jsonMode ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Tool / Function Calling Toggle */}
                <button
                  type="button"
                  onClick={() => onOptionsChange?.({ ...options, toolCalling: !options.toolCalling })}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors mb-1 ${
                    options.toolCalling 
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                      : 'themed-sidebar-hover'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wrench size={18} />
                    <span>Tool Calling Agent</span>
                  </div>
                  <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-current">
                    {options.toolCalling ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Temperature/Creativity Slider */}
                <div className="p-2.5 rounded-xl border border-white/5 mt-2">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <SlidersHorizontal size={16} /> Creativity
                    </span>
                    <span className="font-mono text-xs font-bold">{options.temperature ?? 0.6}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.1"
                    value={options.temperature ?? 0.6}
                    onChange={(e) => onOptionsChange?.({ ...options, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-pink-500 cursor-pointer h-1 bg-zinc-700 rounded-lg"
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className={`flex items-end gap-2 backdrop-blur-xl border rounded-3xl shadow-lg transition-colors pl-3 sm:pl-4 pr-2 py-2 themed-input relative z-10`}>
          
          {/* "+" Icon Button inside chat input on left side */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`p-2 mb-0.5 sm:mb-1 rounded-full transition-transform active:scale-95 themed-btn ${menuOpen ? 'rotate-45' : ''}`}
            title="Model Capabilities & Tools"
          >
            <Plus size={20} weight="bold" />
          </button>

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e); }
            }}
            placeholder="Type a message..."
            rows={1}
            disabled={disabled}
            className={`flex-1 bg-transparent outline-none resize-none font-medium text-sm sm:text-base py-3 max-h-40 disabled:opacity-50 themed-text`}
            style={{ minHeight: '24px' }}
          />

          <button
            type="submit"
            disabled={disabled || (!value.trim() && attachments.filter((a) => a.parsed && !a.error).length === 0) || parsing}
            className={`w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors themed-send-btn`}
          >
            {parsing ? <SpinnerGap size={18} className="animate-spin" /> : <PaperPlaneTilt size={18} weight="fill" />}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 mt-3 px-2">
          {/* Wife Mode - bottom left */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleWifeMode}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${wifeMode ? 'themed-wife-accent-text' : 'themed-sidebar-muted'}`}
            >
              {wifeMode ? <LockOpen size={14} weight="fill" /> : <Lock size={14} />}
              <span>Wife Mode</span>
            </button>
            <button
              type="button"
              onClick={onToggleWifeMode}
              className={`relative w-9 h-5 rounded-full transition-colors ${wifeMode ? 'bg-[var(--wife-accent)]' : 'bg-[var(--offline-bg)]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${wifeMode ? 'translate-x-4' : ''}`} />
            </button>
          </div>

          {/* Active capability indicators */}
          <div className="flex items-center gap-1.5">
            {options.jsonMode && (
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                JSON Mode
              </span>
            )}
            {options.toolCalling && (
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                Tools Active
              </span>
            )}
            {attachments.length > 0 && (
              <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
                {attachments.length} File{attachments.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Discord link - bottom right */}
          <a
            href="https://discord.com/oauth2/authorize?client_id=1536094288142794792"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors themed-sidebar-muted hover:themed-text`}
          >
            <DiscordLogo size={16} weight="fill" />
            <span className="hidden sm:inline">Use the Discord bot version</span>
            <span className="sm:hidden">Discord bot</span>
          </a>
        </div>
      </form>
    </div>
  );
}