import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  List,
  Lock,
  CaretDown,
  Palette,
  Globe,
  YoutubeLogo,
  FileCode,
  CheckCircle,
  WarningCircle,
  ArrowClockwise,
  Heart,
  X,
  ArrowsLeftRight,
  Check,
  Copy,
  Warning,
} from '@phosphor-icons/react';
import { Sidebar } from './components/Sidebar';
import { ThemeSidebar } from './components/ThemeSidebar';
import { THEMES } from './lib/themes';
import { ChatInput } from './components/ChatInput';
import { DeleteModal } from './components/DeleteModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  fetchAIReply,
  verifyWifePassword,
  generateTitle,
  analyzeImageWithVision,
  pingServer,
} from './lib/api';
import { TOOL_DEFINITIONS, executeTool, getBrowserInfo } from './lib/tools';
import { formatFileForContext } from './lib/fileParser';
import {
  loadConversations,
  createConversation,
  deleteConversation,
  updateConversation,
  saveConversations,
  getRateInfo,
  recordMessage,
  isWifeEnabled,
  setWifeEnabled,
  getTheme,
  setTheme,
  getServerConfig,
  saveServerConfig,
  checkImportClashes,
} from './lib/storage';
import { ToolProgressDisplay } from './components/ToolProgress';

const VERSIONS = ['v1.6', 'v1.4'];
const GENERIC_ERROR = "Action could not be completed. Serafina couldn't receive your message or she couldn't react to it.";

function Logo({ size = 40, className = '', variant = 1, overflow = false }) {
  const src = variant === 1 ? '/seraphina1.png' : '/seraphina2.png';
  return (
    <img
      src={src}
      alt="Serafina"
      className={className}
      style={{
        width: overflow ? `${size * 1.05}px` : `${size}px`,
        height: overflow ? `${size * 1.05}px` : `${size}px`,
        objectFit: 'cover',
        objectPosition: 'center top',
      }}
    />
  );
}

function TalkingAvatar({ size = 56, isLatest = false, isStreaming = false }) {
  const [variant, setVariant] = useState(1);

  useEffect(() => {
    if (!isLatest && !isStreaming) {
      setVariant(1);
      return;
    }
    let timeoutId;
    const startTime = Date.now();
    const DURATION = 2200;

    const cycle = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= DURATION && !isStreaming) {
        setVariant(1);
        return;
      }
      setVariant((prev) => (prev === 1 ? 2 : 1));
      const nextDelay = Math.floor(Math.random() * (260 - 130 + 1)) + 130;
      timeoutId = setTimeout(cycle, nextDelay);
    };

    const initialDelay = 150;
    timeoutId = setTimeout(cycle, initialDelay);
    return () => clearTimeout(timeoutId);
  }, [isLatest, isStreaming]);

  return (
    <div className="themed-logo-box w-12 h-12 sm:w-14 sm:h-14 rounded-xl border flex items-center justify-center shrink-0 mt-1 overflow-hidden relative select-none">
      <img
        src="/seraphina1.png"
        alt="Serafina"
        loading="eager"
        decoding="sync"
        className="absolute inset-0 w-full h-full object-cover object-top"
      />
      <img
        src="/seraphina2.png"
        alt="Serafina"
        loading="eager"
        decoding="sync"
        className={`absolute inset-0 w-full h-full object-cover object-top ${
          variant === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
    </div>
  );
}

function BlockScreen({ resetIn }) {
  const mins = Math.ceil(resetIn / 60000);
  const secs = Math.ceil((resetIn % 60000) / 1000);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] themed-block-screen backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-red-500 blur-[80px] opacity-30 animate-pulse" />
          <Lock size={96} className="text-red-500 relative z-10" weight="duotone" />
          <Warning size={32} className="text-white absolute -top-2 -right-2 z-20 animate-bounce p-1 bg-red-500 rounded-full" weight="fill" />
        </div>
        <h2 className="text-4xl sm:text-5xl font-black mb-4 tracking-tighter themed-text">YOU ARE BLOCKED</h2>
        <p className="text-red-500 uppercase tracking-[0.3em] text-xs font-bold mb-6">Rate Limit Exceeded</p>
        <div className="text-xl sm:text-2xl font-mono font-bold mb-2 themed-text">
          {mins > 0 ? `${mins}m ${secs}s remaining` : 'Resetting...'}
        </div>
        <p className="text-sm mt-4 max-w-sm themed-modal-muted">
          You have sent too many messages. Please wait 30 minutes before sending more.
        </p>
<p className="text-sm mt-2 themed-modal-muted">
          Or switch to <a href="https://muxai.vercel.app/" target="_blank" rel="noreferrer" className="underline font-bold text-red-500 hover:opacity-80">MuxAI</a> for unlimited messages (it's free).
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const [conversations, setConversations] = useState(() => loadConversations());
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeSidebarOpen, setThemeSidebarOpen] = useState(false);
  const [rateInfo, setRateInfo] = useState(() => getRateInfo());
  const [wifeMode, setWifeMode] = useState(() => isWifeEnabled());
  const [wifeModal, setWifeModal] = useState(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState('v1.6');
  const [versionDropdown, setVersionDropdown] = useState(false);
  const [theme, setThemeState] = useState(() => getTheme());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [modelOptions, setModelOptions] = useState({
    jsonMode: false,
    toolCalling: false,
    temperature: 0.6,
  });
  const [toolProgress, setToolProgress] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Server modal state
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [serverConfig, setServerConfigState] = useState(() => getServerConfig());
  const [modalServerConfig, setModalServerConfig] = useState(() => getServerConfig());
  const [testStatus, setTestStatus] = useState({ testing: false, success: null, message: '' });

  // Conflict modal state for imports
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictQueue, setConflictQueue] = useState([]);
  const [safeImportQueue, setSafeImportQueue] = useState([]);
  const [currentConflictIdx, setCurrentConflictIdx] = useState(0);

  const scrollRef = useRef(null);
  const versionMenuRef = useRef(null);

  useEffect(() => {
    if (!versionDropdown) return;
    const handleOutside = (e) => {
      if (versionMenuRef.current && !versionMenuRef.current.contains(e.target)) {
        setVersionDropdown(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [versionDropdown]);

  useEffect(() => {
    const activeThemeData = THEMES.find((t) => t.id === theme) || THEMES[0];
    const root = document.documentElement;
    Object.entries(activeThemeData.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme]);

  // Initial load - sync URL chat ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlChatId = params.get('chat');
    if (urlChatId && conversations.some((c) => c.id === urlChatId)) {
      setActiveId(urlChatId);
    } else if (urlChatId) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Ping server periodically
  useEffect(() => {
    let isMounted = true;
    const checkPing = async () => {
      const res = await pingServer();
      if (isMounted) {
        setIsOnline(res.online);
      }
    };
    checkPing();
    const interval = setInterval(checkPing, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [serverConfig]);

  useEffect(() => {
    const url = new URL(window.location);
    if (activeId) {
      url.searchParams.set('chat', activeId);
    } else {
      url.searchParams.delete('chat');
    }
    window.history.replaceState({}, '', url);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    const conv = conversations.find((c) => c.id === activeId);
    setMessages(conv ? conv.messages : []);
  }, [activeId, conversations]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const t = setInterval(() => {
      const info = getRateInfo();
      setRateInfo(info);
      if (!info.blocked) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleNew = () => {
    const conv = createConversation('New chat');
    setConversations(loadConversations());
    setActiveId(conv.id);
    setMessages([]);
    setSidebarOpen(false);
    setError('');
  };

  const handleSelect = (id) => {
    setActiveId(id);
    setSidebarOpen(false);
    setError('');
  };

  const handleRename = (id, newTitle) => {
    updateConversation(id, (c) => ({ ...c, title: newTitle, customTitle: true }));
    setConversations(loadConversations());
  };

  const handleDeleteRequest = (id) => {
    const conv = conversations.find((c) => c.id === id);
    setDeleteTarget(conv || { id, title: 'New chat' });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const remaining = deleteConversation(deleteTarget.id);
    setConversations(remaining);
    if (activeId === deleteTarget.id) {
      setActiveId(remaining[0]?.id || null);
      setMessages(remaining[0]?.messages || []);
    }
    setDeleteTarget(null);
  };

  const persistMessages = (convId, msgs) => {
    updateConversation(convId, (c) => ({ ...c, messages: msgs }));
    setConversations(loadConversations());
  };

  const maybeGenerateTitle = async (convId, msgs) => {
    if (!msgs || msgs.length === 0 || msgs.length % 5 !== 0) return;
    const activeConv = conversations.find((c) => c.id === convId);
    if (activeConv?.customTitle) return;
    try {
      const title = await generateTitle(msgs, version);
      if (title && title !== 'New chat') {
        updateConversation(convId, (c) => ({ ...c, title }));
        setConversations(loadConversations());
      }
    } catch {
      // Suppress title generation errors
    }
  };

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  const runAssistantLoop = async (convId, baseMsgs, conversationHistory) => {
    setLoading(true);
    setError('');
    setToolProgress({ phase: 'thinking' });

    const tools = modelOptions.toolCalling ? TOOL_DEFINITIONS : null;
    const browserInfo = getBrowserInfo();
    const MAX_TOOL_ROUNDS = 5;
    let gotFinalReply = false;

    try {
      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const data = await fetchAIReply(conversationHistory, wifeMode, version, {
          jsonMode: modelOptions.jsonMode,
          temperature: modelOptions.temperature,
          tools: round === 0 ? tools : null,
        });

        if (!data.toolCalls || !Array.isArray(data.toolCalls) || data.toolCalls.length === 0) {
          const replyText = data.reply || '';
          const aiMsg = {
            id: `msg_a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            role: 'assistant',
            content: replyText,
          };
          const finalMsgs = [...baseMsgs, aiMsg];
          setMessages(finalMsgs);
          persistMessages(convId, finalMsgs);
          const info = recordMessage();
          setRateInfo(info);
          maybeGenerateTitle(convId, finalMsgs);
          gotFinalReply = true;
          break;
        }

        if (data.reply) {
          conversationHistory.push({ role: 'assistant', content: data.reply });
        }

        const toolProgressList = data.toolCalls.map((tc) => ({
          name: tc.function?.name || 'unknown',
          status: 'pending',
        }));
        setToolProgress({ phase: 'calling_tools', tools: toolProgressList });

        const toolResultParts = [];

        for (let i = 0; i < data.toolCalls.length; i++) {
          const tc = data.toolCalls[i];
          const toolName = tc.function?.name || 'unknown';
          let parsedArgs = {};
          try { parsedArgs = JSON.parse(tc.function?.arguments || '{}'); } catch {}

          toolProgressList[i].status = 'executing';
          setToolProgress({ phase: 'calling_tools', tools: [...toolProgressList] });

          const result = await executeTool(toolName, parsedArgs, browserInfo);

          toolProgressList[i].status = 'done';
          setToolProgress({ phase: 'calling_tools', tools: [...toolProgressList] });

          toolResultParts.push(`[Tool: ${toolName}]\nArguments: ${JSON.stringify(parsedArgs)}\nResult: ${result}`);
        }

        setToolProgress({ phase: 'processing_results' });

        conversationHistory.push({
          role: 'user',
          content: `Here are the real-time tool results. Use this data to answer the user's question. Do NOT call any more tools — just respond naturally using this data.\n\n${toolResultParts.join('\n\n')}`,
        });
      }

      if (!gotFinalReply) {
        setToolProgress({ phase: 'thinking_after_tools' });
        const finalData = await fetchAIReply(conversationHistory, wifeMode, version, {
          jsonMode: modelOptions.jsonMode,
          temperature: modelOptions.temperature,
          tools: null,
        });
        const replyText = finalData.reply || 'I was unable to process the tool results.';
        const aiMsg = {
          id: `msg_a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          role: 'assistant',
          content: replyText,
        };
        const finalMsgs = [...baseMsgs, aiMsg];
        setMessages(finalMsgs);
        persistMessages(convId, finalMsgs);
        const info = recordMessage();
        setRateInfo(info);
        maybeGenerateTitle(convId, finalMsgs);
      }
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
      setToolProgress(null);
    }
  };

  const handleRetry = async (targetIndex) => {
    if (loading) return;
    const convId = activeId;
    if (!convId) return;
    const targetMsg = messages[targetIndex];
    if (!targetMsg || targetMsg.role !== 'user') return;

    const newMsgs = messages.slice(0, targetIndex + 1);
    setMessages(newMsgs);
    persistMessages(convId, newMsgs);

    let fullContextContent = targetMsg.content || '';
    const attachments = targetMsg.attachments || [];
    const docAttachments = attachments.filter((a) => a.type !== 'image');
    if (docAttachments.length > 0) {
      const docParts = docAttachments.map((a) => formatFileForContext(a));
      fullContextContent = `${fullContextContent}\n\n--- ATTACHED FILES ---\n${docParts.join('\n\n')}`.trim();
    }

    const historyBefore = messages.slice(0, targetIndex).map((m) => ({ role: m.role, content: m.content }));
    const conversationHistory = [...historyBefore, { role: 'user', content: fullContextContent }];

    await runAssistantLoop(convId, newMsgs, conversationHistory);
  };

  const handleSend = async (text, attachments = []) => {
    let convId = activeId;
    let currentConvs = conversations;

    if (!convId) {
      const conv = createConversation('New chat');
      convId = conv.id;
      currentConvs = loadConversations();
      setConversations(currentConvs);
      setActiveId(convId);
    }
    
    const activeConv = currentConvs.find(c => c.id === convId);
    if (activeConv && activeConv.title === 'New chat' && messages.length === 0) {
      const newTitle = `Chat #${currentConvs.length}`;
      updateConversation(convId, (c) => ({ ...c, title: newTitle }));
      currentConvs = loadConversations();
      setConversations(currentConvs);
    }

    const displayText = text || (attachments.length > 0 ? `[Attached ${attachments.length} file(s)]` : '');
    let fullContextContent = text;
    const imageAttachments = attachments.filter((a) => a.type === 'image');
    const docAttachments = attachments.filter((a) => a.type !== 'image');

    if (docAttachments.length > 0) {
      const docParts = docAttachments.map((a) => formatFileForContext(a));
      fullContextContent = `${fullContextContent}\n\n--- ATTACHED FILES ---\n${docParts.join('\n\n')}`.trim();
    }

    let visionAnalysis = '';
    if (imageAttachments.length > 0) {
      setLoading(true);
      setToolProgress({ phase: 'calling_tools', tools: imageAttachments.map((_, i) => ({ name: 'analyze_image', status: i === 0 ? 'executing' : 'pending' })) });
      try {
        const visionPrompt = text || 'Describe this image in detail. What do you see?';
        const imageBase64s = imageAttachments.map((a) => a.base64);
        visionAnalysis = await analyzeImageWithVision(visionPrompt, imageBase64s);
        setToolProgress({ phase: 'calling_tools', tools: imageAttachments.map(() => ({ name: 'analyze_image', status: 'done' })) });
      } catch (err) {
        visionAnalysis = `[Vision analysis failed: ${err.message || 'Unknown error'}]`;
        setToolProgress({ phase: 'calling_tools', tools: imageAttachments.map(() => ({ name: 'analyze_image', status: 'done' })) });
      }

      if (visionAnalysis) {
        const imageNames = imageAttachments.map((a) => a.name).join(', ');
        fullContextContent = `${fullContextContent}\n\n--- IMAGE ANALYSIS (${imageNames}) ---\nThe vision model analyzed the attached image(s) and produced this description:\n${visionAnalysis}`.trim();
      }
    }

    const userMsg = {
      id: `msg_u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: displayText,
      attachments,
    };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    persistMessages(convId, newMsgs);

    const historyBefore = messages.map((m) => ({ role: m.role, content: m.content }));
    const conversationHistory = [...historyBefore, { role: 'user', content: fullContextContent }];

    await runAssistantLoop(convId, newMsgs, conversationHistory);
  };

  const handleToggleWifeMode = () => {
    if (wifeMode) {
      setWifeMode(false);
      setWifeEnabled(false);
    } else {
      setWifeModal({ input: '', error: '', loading: false });
    }
  };

  const submitWifePassword = async () => {
    setWifeModal({ ...wifeModal, loading: true, error: '' });
    try {
      const valid = await verifyWifePassword(wifeModal.input);
      if (valid) {
        setWifeMode(true);
        setWifeEnabled(true);
        setWifeModal(null);
      } else {
        setWifeModal({ ...wifeModal, loading: false, error: 'Incorrect password' });
      }
    } catch {
      setWifeModal({ ...wifeModal, loading: false, error: 'Verification failed' });
    }
  };

  // Server Modal Operations
  const openServerModal = () => {
    setModalServerConfig({ ...serverConfig });
    setTestStatus({ testing: false, success: null, message: '' });
    setServerModalOpen(true);
  };

  const handleTestConnection = async () => {
    setTestStatus({ testing: true, success: null, message: 'Testing connection to server...' });
    const urlToTest = modalServerConfig.mode === 'custom' ? modalServerConfig.customUrl : '';
    const res = await pingServer(urlToTest);
    if (res.online) {
      setTestStatus({
        testing: false,
        success: true,
        message: `Server connected successfully (${res.mode} mode).`,
      });
    } else {
      setTestStatus({
        testing: false,
        success: false,
        message: 'Connection failed.',
      });
    }
  };

  const handleSaveServerConfig = () => {
    const saved = saveServerConfig(modalServerConfig);
    setServerConfigState(saved);
    setServerModalOpen(false);
    // Trigger immediate ping
    pingServer().then((res) => setIsOnline(res.online));
  };

  // Import handling & Conflict Resolution
  const handleImportData = (parsedData) => {
    const { clashes, safeToImport } = checkImportClashes(parsedData);
    if (clashes.length > 0) {
      setConflictQueue(clashes);
      setSafeImportQueue(safeToImport);
      setCurrentConflictIdx(0);
      setConflictModalOpen(true);
    } else {
      // No clashes, merge safe conversations
      const existing = loadConversations();
      const updated = [...safeToImport, ...existing];
      saveConversations(updated);
      setConversations(updated);
      if (safeToImport.length > 0 && !activeId) {
        setActiveId(safeToImport[0].id);
      }
      alert(`Successfully imported ${safeToImport.length} conversation(s).`);
    }
  };

  const resolveCurrentConflict = (decision) => {
    const current = conflictQueue[currentConflictIdx];
    let resolvedList = [...conversations];

    if (decision === 'keep-imported') {
      // Replace existing with imported
      resolvedList = resolvedList.map((c) => (c.id === current.existing.id ? current.imported : c));
    } else if (decision === 'keep-both') {
      // Keep existing and append imported with new ID
      const renamed = {
        ...current.imported,
        id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: `${current.imported.title} (Imported)`,
      };
      resolvedList.unshift(renamed);
    }
    // 'keep-existing': leave existing alone, don't add imported

    // Next or finish
    if (currentConflictIdx + 1 < conflictQueue.length) {
      setConversations(resolvedList);
      saveConversations(resolvedList);
      setCurrentConflictIdx((prev) => prev + 1);
    } else {
      // Merge any pending safeToImport items
      const finalConvs = [...safeImportQueue, ...resolvedList];
      saveConversations(finalConvs);
      setConversations(finalConvs);
      setConflictModalOpen(false);
      setConflictQueue([]);
      setSafeImportQueue([]);
      setCurrentConflictIdx(0);
    }
  };

  const resolveAllConflicts = (decision) => {
    let resolvedList = [...conversations];
    conflictQueue.forEach(({ existing, imported }) => {
      if (decision === 'keep-imported') {
        resolvedList = resolvedList.map((c) => (c.id === existing.id ? imported : c));
      } else if (decision === 'keep-both') {
        resolvedList.unshift({
          ...imported,
          id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          title: `${imported.title} (Imported)`,
        });
      }
    });

    const finalConvs = [...safeImportQueue, ...resolvedList];
    saveConversations(finalConvs);
    setConversations(finalConvs);
    setConflictModalOpen(false);
    setConflictQueue([]);
    setSafeImportQueue([]);
    setCurrentConflictIdx(0);
  };

  return (
    <div className="themed-bg themed-text h-screen w-screen overflow-hidden relative">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" style={{ contain: 'strict' }}>
        <div className="themed-aurora-1 absolute -top-1/4 -left-1/4 w-[500px] h-[500px] sm:w-[600px] sm:h-[600px] rounded-full animate-aurora-1" />
        <div className="themed-aurora-2 absolute top-1/3 -right-1/4 w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] rounded-full animate-aurora-2" />
        <div className="themed-aurora-3 absolute -bottom-1/4 left-1/3 w-[450px] h-[450px] sm:w-[550px] sm:h-[550px] rounded-full animate-aurora-3" />
      </div>

      <div className="themed-grid-bg fixed inset-0 z-0 pointer-events-none opacity-[0.03]" />

      <div className="absolute inset-0 flex flex-col z-10">
        <header className="themed-header flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-b backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              setThemeSidebarOpen(false);
              setSidebarOpen((v) => !v);
            }}
            className="themed-burger p-2 rounded-lg transition-colors"
            title="Toggle conversations sidebar"
          >
            <List size={22} />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-bold text-base sm:text-lg">Serafina</span>
          </div>

          <div className="relative" ref={versionMenuRef}>
            <button
              type="button"
              onClick={() => setVersionDropdown((v) => !v)}
              className="themed-version-btn flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors"
            >
              {version}
              <CaretDown size={14} className={`transition-transform duration-200 ${versionDropdown ? 'rotate-180' : ''}`} />
            </button>
            {versionDropdown && (
              <div
                className="themed-dropdown absolute top-full left-0 mt-2 w-28 sm:w-32 border rounded-xl shadow-2xl overflow-hidden z-20"
              >
                {VERSIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setVersion(v); setVersionDropdown(false); }}
                    className={`w-full text-left px-3 sm:px-4 py-2.5 text-xs sm:text-sm transition-colors ${
                      v === version ? 'themed-version-active' : 'themed-version-inactive'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {wifeMode && (
            <Heart size={22} weight="fill" className="text-rose-500 shrink-0" title="Wife Mode Active" />
          )}

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              onClick={openServerModal}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-bold transition-all cursor-pointer hover:opacity-90 active:scale-95 ${
                isOnline ? 'themed-online' : 'themed-offline'
              }`}
              title="Click to configure backend server & custom ngrok URL"
            >
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-current shadow-[0_0_8px_currentColor] animate-pulse' : 'bg-zinc-400'}`} />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
              <span className="text-[10px] opacity-75 font-normal uppercase hidden sm:inline">
                ({serverConfig.mode})
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                setThemeSidebarOpen((v) => !v);
              }}
              className="themed-btn p-2 rounded-lg transition-colors"
              title="Change theme"
            >
              <Palette size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {messages.length === 0 && !loading && (
              <div
                className="flex flex-col items-center justify-center text-center pt-16 sm:pt-24 select-none"
              >
                <h2 className="themed-welcome-text text-xl sm:text-2xl font-bold mb-2">How can I help you today?</h2>
                <p className="themed-welcome-sub text-sm">Start a conversation with Serafina</p>
              </div>
            )}

            <div className="space-y-4 sm:space-y-6">
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id || `msg-${i}-${msg.timestamp || ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className={`group/msg flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <TalkingAvatar
                      size={56}
                      isLatest={i === messages.length - 1}
                      isStreaming={loading && i === messages.length - 1}
                    />
                  )}
                  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[80%]`}>
                    <div
                      className={`w-full px-4 sm:px-5 py-3 rounded-2xl text-sm sm:text-base leading-relaxed transition-all duration-200 cursor-default ${
                        msg.role === 'user'
                          ? 'themed-user-bubble rounded-tr-sm hover:shadow-lg hover:-translate-y-0.5'
                          : 'themed-ai-bubble rounded-tl-sm backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5'
                      }`}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        className="break-words space-y-2 text-sm sm:text-base"
                        components={{
                          p: ({ node, ...props }) => <p className="whitespace-pre-wrap leading-relaxed inline-block w-full" {...props} />,
                          code: ({ node, inline, className, children, ...props }) => {
                            return !inline ? (
                              <div className="themed-code-block p-3 rounded-md overflow-x-auto my-2 text-xs sm:text-sm font-mono border shadow-sm">
                                <code className={className} {...props}>{children}</code>
                              </div>
                            ) : (
                              <code className="themed-code-inline rounded px-1.5 py-0.5 text-[0.875em] font-mono" {...props}>{children}</code>
                            );
                          },
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="themed-quote border-l-4 pl-3 my-1 italic" {...props} />
                          ),
                          ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-5 space-y-1" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-5 space-y-1" {...props} />,
                          li: ({ node, ...props }) => <li className="pl-0.5" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                          a: ({ node, ...props }) => <a className="themed-link hover:underline" target="_blank" rel="noreferrer" {...props} />
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.attachments.map((file, idx) => (
                            file.type === 'image' ? (
                              <img 
                                key={idx} 
                                src={file.dataUrl} 
                                alt={file.name} 
                                className="max-w-full h-auto rounded-xl border border-zinc-500/20 max-h-48 object-cover shadow-sm" 
                              />
                            ) : (
                              <div 
                                key={idx} 
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/5 border border-zinc-500/20 text-xs font-medium"
                              >
                                <span className="text-xl">📄</span> 
                                <span className="truncate max-w-[150px]">{file.name}</span>
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex items-center gap-1.5 pt-1.5 px-1 opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity duration-150 select-none ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="themed-btn flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                            title={copiedId === msg.id ? 'Copied to clipboard' : 'Copy text'}
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check size={12} className="text-emerald-500" />
                                <span className="text-[11px] text-emerald-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span className="text-[11px]">Copy</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRetry(i)}
                            disabled={loading}
                            className={`themed-btn flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
                              loading ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                            title="Retry this message"
                          >
                            <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} />
                            <span className="text-[11px]">Retry</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="themed-btn flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                          title={copiedId === msg.id ? 'Copied to clipboard' : 'Copy text'}
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={12} className="text-emerald-500" />
                              <span className="text-[11px] text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span className="text-[11px]">Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2 sm:gap-3 justify-start"
              >
                <div className="themed-logo-box w-12 h-12 sm:w-14 sm:h-14 rounded-xl border flex items-center justify-center shrink-0 mt-1 overflow-hidden">
                  <Logo size={56} variant={2} overflow />
                </div>
                <div className="themed-ai-bubble px-4 sm:px-5 py-4 rounded-2xl border min-h-[56px] flex items-center">
                  <ToolProgressDisplay progress={toolProgress || { phase: 'thinking' }} />
                </div>
              </motion.div>
            )}

            {error && (
              <div className="themed-error max-w-3xl mx-auto text-sm border rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </main>

        <ChatInput
          onSend={handleSend}
          disabled={loading || rateInfo.blocked}
          wifeMode={wifeMode}
          onToggleWifeMode={handleToggleWifeMode}
          options={modelOptions}
          onOptionsChange={setModelOptions}
        />
      </div>
 
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDeleteRequest}
        onRename={handleRename}
        onImportData={handleImportData}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <ThemeSidebar
        activeTheme={theme}
        onSelect={(newTheme) => {
          setThemeState(newTheme);
          setTheme(newTheme);
        }}
        open={themeSidebarOpen}
        onClose={() => setThemeSidebarOpen(false)}
      />

      {rateInfo.blocked && <BlockScreen resetIn={rateInfo.resetIn} />}

      {/* Wife Mode Unlock Modal */}
      <AnimatePresence>
        {wifeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => !wifeModal.loading && setWifeModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="themed-modal border rounded-3xl max-w-sm w-full p-8 shadow-2xl"
            >
              <div className="flex justify-center mb-4">
                <div className="themed-wife-modal-icon w-14 h-14 rounded-full border flex items-center justify-center">
                  <Lock size={28} weight="duotone" />
                </div>
              </div>
              <h3 className="themed-modal text-xl font-bold text-center mb-2">Wife Mode</h3>
              <p className="themed-modal-muted text-center text-sm mb-6">Enter the password to enable Wife Mode</p>
              <input
                type="password"
                autoFocus
                value={wifeModal.input}
                onChange={(e) => setWifeModal({ ...wifeModal, input: e.target.value, error: '' })}
                onKeyDown={(e) => { if (e.key === 'Enter' && !wifeModal.loading) submitWifePassword(); }}
                placeholder="Password"
                className="themed-modal-input themed-wife-input w-full px-4 py-3 rounded-xl border outline-none mb-2"
              />
              {wifeModal.error && <p className="text-red-400 text-xs mb-2">{wifeModal.error}</p>}
              <button
                onClick={submitWifePassword}
                disabled={wifeModal.loading}
                className="themed-wife-btn w-full py-3 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {wifeModal.loading ? 'Verifying...' : 'Unlock'}
              </button>
              <button
                onClick={() => setWifeModal(null)}
                className="themed-modal-muted w-full py-2 mt-2 text-sm hover:text-red-400 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Server Settings Modal */}
      <AnimatePresence>
        {serverModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/65 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setServerModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="themed-modal border rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl overflow-hidden relative"
            >
              <button
                onClick={() => setServerModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg themed-sidebar-hover themed-modal-muted transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Globe size={22} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-lg font-bold themed-text">Backend Server</h3>
                  <p className="text-xs themed-modal-muted">Choose how to connect Serafina's mind</p>
                </div>
              </div>

              {/* Mode switch */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/5 border border-inherit mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalServerConfig((prev) => ({ ...prev, mode: 'default' }));
                    setTestStatus({ testing: false, success: null, message: '' });
                  }}
                  className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    modalServerConfig.mode === 'default'
                      ? 'bg-white shadow-sm text-zinc-900'
                      : 'themed-modal-muted hover:text-zinc-900'
                  }`}
                >
                  Default Server
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalServerConfig((prev) => ({ ...prev, mode: 'custom' }));
                    setTestStatus({ testing: false, success: null, message: '' });
                  }}
                  className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    modalServerConfig.mode === 'custom'
                      ? 'bg-white shadow-sm text-zinc-900'
                      : 'themed-modal-muted hover:text-zinc-900'
                  }`}
                >
                  Custom Server (ngrok)
                </button>
              </div>

              {modalServerConfig.mode === 'default' ? (
                <div className="p-3.5 rounded-xl border border-dashed border-inherit bg-black/[0.02] text-xs themed-modal-muted mb-5 leading-relaxed">
                  Running from the main development server.
                </div>
              ) : (
                <div className="mb-5 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider themed-modal-muted">
                    Ngrok Public URL
                  </label>
                  <input
                    type="url"
                    value={modalServerConfig.customUrl}
                    onChange={(e) => {
                      setModalServerConfig((prev) => ({ ...prev, customUrl: e.target.value }));
                      setTestStatus({ testing: false, success: null, message: '' });
                    }}
                    placeholder="https://xxxx-xx-xx.ngrok-free.app"
                    className="themed-modal-input w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none font-mono transition-colors"
                  />
                  <p className="text-[11px] themed-modal-muted">
                    This URL is automatically saved to browser persistent storage so you won't lose it on reload.
                  </p>
                </div>
              )}

              {/* Test connection & result */}
              <div className="flex items-center gap-2 mb-5">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus.testing || (modalServerConfig.mode === 'custom' && !modalServerConfig.customUrl.trim())}
                  className="themed-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50"
                >
                  <ArrowClockwise size={14} className={testStatus.testing ? 'animate-spin' : ''} />
                  {testStatus.testing ? 'Testing...' : 'Test Connection'}
                </button>
                {testStatus.message && (
                  <span className={`text-xs flex items-center gap-1 truncate ${testStatus.success ? 'text-lime-600' : 'text-red-500'}`}>
                    {testStatus.success ? <CheckCircle size={14} weight="bold" /> : <WarningCircle size={14} weight="bold" />}
                    {testStatus.message}
                  </span>
                )}
              </div>

              {/* 2 Buttons: YouTube Tutorial & Download .ipynb */}
              <div className="space-y-2.5 pt-3 border-t border-inherit mb-5">
                <a
                  href="https://www.youtube.com/watch?v=uDJnu2EEzRc"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-semibold transition-all bg-red-500/10 hover:bg-red-500/15 border-red-500/20 text-red-600 hover:scale-[1.01]"
                >
                  <YoutubeLogo size={18} weight="fill" />
                  <span>YouTube Tutorial (Setup Guide)</span>
                </a>

                <a
                  href="https://muxai.vercel.app/muxai_backend_runner.ipynb"
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-semibold transition-all bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/20 text-indigo-600 hover:scale-[1.01]"
                >
                  <FileCode size={18} weight="duotone" />
                  <span>Download .ipynb Backend Runner</span>
                </a>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveServerConfig}
                  className="themed-send-btn flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all"
                >
                  Save & Connect
                </button>
                <button
                  type="button"
                  onClick={() => setServerModalOpen(false)}
                  className="themed-btn px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflict Resolution Modal for Conversation Imports */}
      <AnimatePresence>
        {conflictModalOpen && conflictQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="themed-modal border rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <ArrowsLeftRight size={22} weight="bold" />
                </div>
                <div>
                  <h3 className="text-lg font-bold themed-text">Conversation Clash Detected</h3>
                  <p className="text-xs themed-modal-muted">
                    Conflict {currentConflictIdx + 1} of {conflictQueue.length}: A conversation with matching ID or title already exists.
                  </p>
                </div>
              </div>

              {/* Compare Existing vs Imported */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
                {/* Existing */}
                <div className="p-3.5 rounded-2xl border border-inherit bg-black/[0.02] flex flex-col">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500 mb-1">
                    Current Version
                  </div>
                  <div className="font-bold text-sm truncate mb-1">
                    {conflictQueue[currentConflictIdx]?.existing?.title}
                  </div>
                  <div className="text-xs themed-modal-muted mb-2">
                    {conflictQueue[currentConflictIdx]?.existing?.messages?.length || 0} messages • {new Date(conflictQueue[currentConflictIdx]?.existing?.createdAt || Date.now()).toLocaleDateString()}
                  </div>
                  <div className="mt-auto p-2 rounded-lg bg-black/5 text-xs line-clamp-3 themed-modal-muted font-mono">
                    {conflictQueue[currentConflictIdx]?.existing?.messages?.[conflictQueue[currentConflictIdx]?.existing?.messages?.length - 1]?.content || '(No preview)'}
                  </div>
                </div>

                {/* Imported */}
                <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.03] flex flex-col">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1">
                    Imported Version
                  </div>
                  <div className="font-bold text-sm truncate mb-1">
                    {conflictQueue[currentConflictIdx]?.imported?.title}
                  </div>
                  <div className="text-xs themed-modal-muted mb-2">
                    {conflictQueue[currentConflictIdx]?.imported?.messages?.length || 0} messages • {new Date(conflictQueue[currentConflictIdx]?.imported?.createdAt || Date.now()).toLocaleDateString()}
                  </div>
                  <div className="mt-auto p-2 rounded-lg bg-black/5 text-xs line-clamp-3 themed-modal-muted font-mono">
                    {conflictQueue[currentConflictIdx]?.imported?.messages?.[conflictQueue[currentConflictIdx]?.imported?.messages?.length - 1]?.content || '(No preview)'}
                  </div>
                </div>
              </div>

              {/* Choice buttons */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => resolveCurrentConflict('keep-existing')}
                  className="themed-btn flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all hover:border-blue-500"
                >
                  <Check size={14} /> Keep Current
                </button>
                <button
                  type="button"
                  onClick={() => resolveCurrentConflict('keep-imported')}
                  className="themed-send-btn flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all"
                >
                  <Check size={14} /> Keep Imported
                </button>
                <button
                  type="button"
                  onClick={() => resolveCurrentConflict('keep-both')}
                  className="themed-btn flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all hover:border-amber-500"
                >
                  <Copy size={14} /> Keep Both
                </button>
              </div>

              {conflictQueue.length > 1 && (
                <div className="pt-3 border-t border-inherit flex items-center justify-between text-xs themed-modal-muted">
                  <span>Batch resolve all:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => resolveAllConflicts('keep-existing')}
                      className="hover:underline text-blue-500 font-medium"
                    >
                      Keep All Current
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => resolveAllConflicts('keep-imported')}
                      className="hover:underline text-amber-500 font-medium"
                    >
                      Keep All Imported
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => resolveAllConflicts('keep-both')}
                      className="hover:underline text-zinc-600 font-medium"
                    >
                      Keep Both for All
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {deleteTarget && (
        <DeleteModal
          conversation={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
