// src/components/BrowserStatusBar.jsx
import { SpinnerGap, Lightning, Cpu } from '@phosphor-icons/react';

export function BrowserStatusBar({
  modelStatus = { status: 'ready', progress: 100, text: '' },
  telemetry = { tokensPerSec: 0, ttftMs: 0, totalTimeSec: 0, tokenCount: 0, isGenerating: false },
  device = 'webgpu',
  modelName = 'SLM',
}) {
  const isDownloading = modelStatus.status === 'downloading' || modelStatus.status === 'loading' || modelStatus.status === 'initiate';

  return (
    <div className="w-full mb-2 px-3 sm:px-3.5 py-1.5 rounded-2xl border border-inherit bg-black/10 dark:bg-white/5 backdrop-blur-md text-xs shadow-xs transition-all select-none">
      {isDownloading ? (
        /* Download / Loading Progress Bar */
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs font-mono">
            <span className="flex items-center gap-1.5 font-semibold text-pink-400 truncate">
              <SpinnerGap size={13} className="animate-spin shrink-0" />
              <span className="truncate">{modelStatus.text || `Downloading ${modelName}...`}</span>
            </span>
            <span className="font-bold shrink-0">{modelStatus.progress || 0}%</span>
          </div>
          <div className="w-full h-1.5 bg-black/20 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-200 ease-out rounded-full"
              style={{ width: `${Math.max(modelStatus.progress || 0, 4)}%` }}
            />
          </div>
        </div>
      ) : (
        /* Real-Time Telemetry Stats (Single Line) */
        <div className="flex items-center justify-between gap-2">
          {/* Telemetry Numbers */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono truncate">
            <span className="flex items-center gap-1 shrink-0 font-bold text-pink-400 mr-1">
              <Lightning size={13} weight="fill" className={telemetry.isGenerating ? 'animate-bounce text-amber-400' : ''} />
              <span className="hidden xs:inline">Stats:</span>
            </span>
            <span className="font-semibold">{telemetry.tokensPerSec} Tokens/sec,</span>
            <span className="hidden sm:inline opacity-90">{telemetry.ttftMs}ms TTFT,</span>
            <span className="hidden sm:inline opacity-90">{telemetry.totalTimeSec}s Total Time,</span>
            <span className="font-semibold">{telemetry.tokenCount} Token Count</span>
          </div>

          {/* Device & Status Indicator */}
          <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
            <span className="px-1.5 py-0.5 rounded border border-inherit bg-black/10 dark:bg-white/10 uppercase font-semibold text-zinc-400 flex items-center gap-1">
              <Cpu size={11} />
              {device}
            </span>
            <div
              className={`w-2 h-2 rounded-full ${
                telemetry.isGenerating
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
              }`}
              title={telemetry.isGenerating ? 'Generating response...' : 'Model ready in browser memory'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
