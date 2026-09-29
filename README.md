# Serafina Web

> An intelligent, reserved romanticist AI companion and conversational platform

![](https://serafina-ai.vercel.app/og-image.png)
---

### [🌐 [Visit the website]](https://serafina-ai.vercel.app)    [:octocat: [Visit the company repo]](https://github.com/muxai/muxai-platform)

Previously, the main project started off from [this repository](https://github.com/dwmk/seraphina-web).

## 🌟 Overview

**Serafina Web** is a full-stack AI conversation application combining sophisticated persona-driven dialogue with both server-side LLMs and client-side on-device SLMs. Built with React, Vite, Express, Tailwind CSS, and Hugging Face Transformers.js (ONNX Runtime Web), Serafina can run entirely within your web browser with zero server dependency or connect to local/remote Ollama backend instances.

---

## ✨ Key Features

### 1. Multi-Model Architecture (Server & On-Device)
- **Server Models (Ollama)**:
  - **`v1.6`**: Serafina's flagship persona—reserved romanticist, dry humor, sharp understated observations, intellectual elegance, and reflective cadence.
  - **`v1.4`**: Contemplative, softly poetic, melancholy romantic with an eye for quiet beauty and classic literature.
- **On-Device Browser Models (Transformers.js)**:
  - **`v1.0-mini` (SmolLM-135M-Instruct)**: Ultra-compact (~90 MB) 135M parameter SLM for instant loading and snappy responses.
  - **`v1.2-mini` (SmolLM2-135M-Instruct)**: Enhanced 135M architecture with improved instruction-following and conversational depth (~90 MB).
  - **`v1.3-mini` (Qwen2.5-0.5B-Instruct)**: High-capacity 0.5B parameter model (~350 MB) with multilingual competence and reasoning.

### 2. Browser-Side SLM Engine
- **Hardware Acceleration**: Automatic WebGPU acceleration with seamless fallback to CPU WASM.
- **Engine Switcher**: Direct `[WebGPU] [WASM]` toggle under the chat input.
- **Persistent Storage**: Model weights are stored in the browser's persistent cache (`navigator.storage.persist()`), eliminating repeat downloads across visits.
- **Real-Time Telemetry Bar**: Live stats showing `Tokens/sec`, `TTFT (Time-To-First-Token)`, `Total Time`, and `Token Count`.
- **Instant Cancellation**: Immediate cancellation and cleanup of in-flight model downloads when switching versions or devices.
- **Unified Pipeline**: Browser SLMs execute through the exact same conversation, persona system prompts, LaTeX math rendering, and tool-calling loop as server models.

### 3. Interactive Puppet Mascot
- **Live2D-Style Puppet**: Layered vector mascot situated above the chat input.
- **Interactive Physics**: Micro-tilt mouse eye tracking (subtle pupil follow physics).
- **Audio Effects**: Dynamic synthesized audio cues for greeting, offline detection, and bouncy click interactions.
- **Context-Aware Dialogue**: Time-of-day greetings ("Late night, isn't it?", "Quiet morning...") and connection state notifications.

### 4. Wife Mode (Devoted Persona)
- **Passcode Protected**: Unlocks an intimate, deeply devoted partnership persona with tender warmth and poetic sincerity.
- **Dedicated Theme Accents**: Dynamic visual shifts in borders, icons, and focus rings.

### 5. Function Calling & Real-Time Tools
- **Web Search**: Real-time DuckDuckGo Lite search queries.
- **Wikipedia**: Encyclopedic summary lookup.
- **Live Weather**: Weather conditions and forecasts via Open-Meteo.
- **Crypto Prices**: CoinGecko live market rates for major cryptocurrencies.
- **Time & Date**: Real-time timezone and clock queries.
- **Safe Calculator**: Multi-step arithmetic evaluation.

### 6. Vision & Multimodal File Ingestion
- **Document Ingestion**: Drag-and-drop support for PDF, DOCX, TXT, CSV, JSON, and source code files up to 20MB.
- **Vision Analysis**: Base64 image inspection and description pipeline.

### 7. Customization & Theming
- **8 Color Themes**: Twilight, Amethyst, Rose Gold, Midnight, Emerald, Sunset, Crimson, Slate.
- **Full Typography**: Serif/sans typographic hierarchy with KaTeX mathematical rendering (`$...$` and `$$...$$`).
- **Data Mobility**: Export and import complete chat histories with automatic clash detection.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn** / **pnpm**
- **Web Browser**:
  - For WebGPU: Google Chrome 113+, Microsoft Edge 113+, or any WebGPU-enabled browser.
  - For WASM: Any modern browser with WebAssembly support.

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/serafina-web.git
cd serafina-web

# Install dependencies
npm install
```

### Environment Configuration

Create a `.env` file in the root directory (or use default settings):

```env
PORT=3000
NODE_ENV=development

# Optional Ollama / Custom Server Defaults
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=qwen2.5:1.5b-instruct
DEFAULT_VISION_MODEL=llava:latest

# Wife Mode Password (Default: serafina)
WIFE_PASSWORD=serafina
```

### Running the Application

```bash
# Start full-stack development server (Express + Vite)
npm run dev

# Or build for production
npm run build
npm start
```

The application will be available at `http://localhost:3000`.

---

## 🧠 Architecture

```
serafina-web/
├── server.ts                    # Express backend (Ollama proxy, tools, vision, Vite middleware)
├── src/
│   ├── App.jsx                  # Main application orchestrator & chat interface
│   ├── components/
│   │   ├── BrowserModelModal.jsx # Consent modal for browser-side SLMs
│   │   ├── BrowserStatusBar.jsx  # Download progress & real-time telemetry bar
│   │   ├── ChatInput.jsx        # Message input, file attachments, and engine switch
│   │   ├── MascotPuppet.jsx     # Live2D interactive mascot with eye tracking
│   │   ├── Sidebar.jsx          # Conversation drawer, search, and data export/import
│   │   ├── ThemeSidebar.jsx     # Visual theme switcher
│   │   └── ToolProgress.jsx     # Visual indicator for function calling rounds
│   ├── lib/
│   │   ├── api.js               # Unified API routing (browser SLMs vs server chat)
│   │   ├── browserModels.js     # Transformers.js ONNX pipeline, download abort, telemetry
│   │   ├── fileParser.js        # PDF, DOCX, CSV, TXT file parsing
│   │   ├── mascotAudio.js       # Synthesized Web Audio API sound generator
│   │   ├── storage.js           # LocalStorage conversation persistence
│   │   ├── themes.js            # Theme definitions & palette maps
│   │   └── tools.js             # Client-side execution of real-time tools
├── index.html                   # HTML entry point
├── package.json                 # Project dependencies & scripts
└── vite.config.js               # Vite bundler configuration
```

---

## ⚙️ Model Details

| Model Identifier | Parameter Count | Backend Engine | Quantization | Size | Target Use Case |
|---|---|---|---|---|---|
| **v1.6** | User-defined | Ollama Server | Upstream | Remote | Full-capacity desktop/server inference |
| **v1.4** | User-defined | Ollama Server | Upstream | Remote | Melancholic romanticism via Ollama |
| **v1.3-mini** | 0.5 Billion | Browser (WebGPU/WASM) | `q4` ONNX | ~350 MB | Strong local reasoning & multilingual |
| **v1.2-mini** | 135 Million | Browser (WebGPU/WASM) | `q4` ONNX | ~90 MB | Balanced dialogue & quick downloads |
| **v1.0-mini** | 135 Million | Browser (WebGPU/WASM) | `q4` ONNX | ~90 MB | Ultra-fast lightweight local inference |

---

## 🔒 Privacy & Offline Capability

- When using **`v1.0-mini`**, **`v1.2-mini`**, or **`v1.3-mini`**, model weights run completely inside your browser process via ONNX Runtime Web.
- No conversational data, prompts, or images are transmitted to external AI servers.
- After the initial download, browser models can run **100% offline** without an internet connection.

---

## 📄 License & Intellectual Property Notice

- **Project License**: The source code and software implementation of **Serafina Web** are distributed under the [MIT License](LICENSE).
- **Original Character & Intellectual Property (IP)**: **Serafina / Seraphina**, including her name, character identity, persona directives, backstory, speech patterns, visual aesthetics, and associated creative lore, is an **Original Character (OC)** and the exclusive **Intellectual Property (IP)** of the creator. This project license applies solely to the software codebase, tools, and technical implementation. It does not grant ownership, trademark, or commercial character rights over Serafina/Seraphina as an intellectual property.

