import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash, Chat, X, Pencil, Check, DownloadSimple, UploadSimple } from '@phosphor-icons/react';
import { exportConversationsJson } from '../lib/storage';

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onImportData,
  open,
  onClose,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const fileInputRef = useRef(null);

  const startRename = (e, c) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditingTitle(c.title);
  };

  const saveRename = (e, id) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      onRename(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleExport = (e) => {
    e.stopPropagation();
    try {
      const jsonStr = exportConversationsJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `serafina_conversations_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (!text || typeof text !== 'string') return;
        const parsed = JSON.parse(text);
        if (onImportData) {
          onImportData(parsed);
        }
      } catch (err) {
        alert('Failed to parse JSON file. Please ensure it is a valid Serafina export file.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'var(--overlay-bg)' }}
          />

          <motion.aside
            key="sidebar-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 h-full w-72 z-50 flex flex-col border-r themed-sidebar-panel shadow-2xl"
          >
            <div className="p-4 flex items-center gap-2 border-b border-inherit">
          <span className="font-bold text-lg themed-sidebar-text">Conversations</span>
          
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={handleExport}
              className="p-1.5 rounded-lg themed-sidebar-hover themed-sidebar-secondary transition-colors"
              title="Export all conversations (JSON)"
            >
              <DownloadSimple size={18} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg themed-sidebar-hover themed-sidebar-secondary transition-colors"
              title="Import conversations (JSON)"
            >
              <UploadSimple size={18} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
            />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg themed-sidebar-hover themed-sidebar-secondary transition-colors"
              title="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-3">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-colors themed-new-chat"
          >
            <Plus size={18} weight="bold" /> New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {conversations.length === 0 && (
            <p className="text-center text-sm mt-8 px-4 themed-sidebar-muted">No conversations yet</p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => editingId !== c.id && onSelect(c.id)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                c.id === activeId ? 'themed-sidebar-active' : 'themed-sidebar-hover themed-sidebar-secondary'
              }`}
            >
              <Chat size={18} className="shrink-0 themed-sidebar-muted" />
              
              {editingId === c.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename(e, c.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="w-full px-2 py-0.5 text-xs rounded border outline-none themed-sidebar-input"
                  />
                  <button onClick={(e) => saveRename(e, c.id)} className="p-1 hover:text-green-400">
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium truncate themed-sidebar-text">{c.title}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startRename(e, c)}
                      className="themed-sidebar-muted hover:text-blue-400 p-0.5"
                      title="Rename conversation"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                      className="themed-sidebar-muted hover:text-red-400 p-0.5"
                      title="Delete conversation"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-inherit text-xs themed-sidebar-muted text-center">
          © Senturisk 2026
        </div>
      </motion.aside>
    </>
  )}
</AnimatePresence>
);
}
