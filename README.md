# Serafina Web

> An intelligent, reserved romanticist AI companion and conversational platform

![](https://serafina-ai.vercel.app/og-image.png)
---

### [🌐 [Visit the website]](https://serafina-ai.vercel.app)    [:octocat: [Visit the company repo]](https://github.com/muxai/muxai-platform)    [:octocat: [GitHub Repository]](https://github.com/dwmk/serafina)

Previously, the main project started off from [this repository](https://github.com/dwmk/seraphina-web), with the active repository now hosted at [dwmk/serafina](https://github.com/dwmk/serafina).

## 🌟 Overview

**Serafina Web** is a full-stack AI conversation application combining sophisticated persona-driven dialogue with both server-side LLMs and client-side on-device SLMs. Built with React 19, TypeScript, Vite, Tailwind CSS, Three.js, @pixiv/three-vrm, and Hugging Face Transformers.js ONNX Web Runtime, Serafina can run entirely within your web browser with zero server dependency or connect to local/remote Ollama backend instances. Designed with modular microservices principles, resilient HTTP and REST APIs, and an event driven architecture for real-time reactivity, the platform delivers radical Cloud cost optimization by shifting neural inference workloads directly to client hardware while supporting automated CI/CD build and delivery pipelines.

---

## ✨ Key Features

- **In-Browser Edge SLM Neural Inference**: Execute lightweight Small Language Models (SmolLM2-135M, SmolLM2-360M, Qwen2.5-0.5B, MiniCPM5-2B, Llama-3.2-1B) directly in the user's browser via Hugging Face Transformers.js and ONNX Runtime Web, maximizing Cloud cost optimization by eliminating ongoing cloud GPU infrastructure expenses.
- **WebGPU & WASM Hardware Acceleration**: Automatic device detection with WebGPU priority, fallback to multi-threaded WebAssembly with FP16/Q4 quantization, and persistent weight caching in browser IndexedDB/OPFS, validated across continuous integration test runners in modern CI/CD workflows.
- **Interactive 3D VRM 1.0 Avatar**: Three.js-rendered 3D humanoid avatar featuring Mixamo idle motion retargeting, dynamic look-at mouse cursor tracking with ocular alignment, procedural eye blinks and micro-saccades, physical recoil impulses on pointer tap, and 360° drag rotation driven by an event driven architecture for responsive rendering loops.
- **Real-Time Phonetic Lip Synchronization**: Centralized viseme analyzer processing Web Speech API audio to actuate VRM mouth shapes (`aa`, `oh`, `ou`, `ih`, `ee`) in sync with spoken voice synthesis and contextual facial expressions via an event driven architecture dispatching frame-by-frame viseme updates.
- **Cloud & Self-Hosted Ollama Support**: Connect to high-capacity cloud Ollama servers (MuxAI) or private local Ollama endpoints (e.g., `http://localhost:11434`), featuring live auto-ping, model tag discovery, and CORS-friendly streaming using standardized HTTP and REST APIs.
- **Continuous Server Ping & Auto-Failover**: Automated 5-second health checks continuously monitor Ollama servers; if a connected server goes offline, Serafina instantly switches to the local SmolLM2 135M browser model and alerts the user with an auto-dismissing notice, communicating through lightweight microservices endpoints over HTTP.
- **Rich Character Persona & Anti-AI Prompting**: Distinctive human persona directives, deliberate speech cadence, simple vocabulary constraints, and strict formatting rules without artificial robotic tropes.
- **Advanced Markdown & LaTeX Formatting for Powerful Models**: High-capability models (including Qwen 2.5 0.5B, MiniCPM 5-2B, Llama 3.2 1B, and Ollama) are equipped with full LaTeX mathematical typography ($inline$ and $$display$$ equations, calculus, matrices) and rich GitHub Flavored Markdown (GFM tables, blockquotes, task lists, and syntax-highlighted code blocks with instant copy), rendered faithfully on the AI side via KaTeX and Prism.
- **Comprehensive Session Management**: Client-side conversation storage in localStorage, full-text dialogue search, message audio playback, editable user prompts, customizable max token budgets, social profile modal with banner crossfade and direct links to GitHub (https://github.com/dwmk/serafina), Discord, and Instagram, and a granular model storage manager.

---

## 🧠 Architecture

```
serafina-web/
├── server.ts                    # Express backend & microservices proxy (VRM proxy, idle motion proxy, Ollama REST APIs over HTTP)
├── src/
│   ├── App.tsx                  # Main application orchestrator & chat interface
│   ├── components/
│   │   ├── ChatInput.tsx        # Message input, model selector trigger, token budget, and send controls
│   │   ├── Header.tsx           # Navigation bar, persona avatar, view mode switch, and modal triggers
│   │   ├── MarkdownRenderer.tsx # Rich Markdown, KaTeX LaTeX math typography, and Prism code syntax highlighting
│   │   ├── MaxTokensSelector.tsx # Configurable token budget dropdown
│   │   ├── MessageItem.tsx      # Individual message card, speech synthesis, and token metrics
│   │   ├── MessageList.tsx      # Conversation scrollable feed with starter prompts
│   │   ├── ModelSelector.tsx    # Drop-up menu for in-browser SLMs and cloud/local Ollama models
│   │   ├── SearchBar.tsx        # In-conversation search and message filter modal
│   │   ├── SettingsModal.tsx    # Hardware acceleration preferences & IndexedDB SLM storage manager
│   │   ├── Sidebar.tsx          # Conversation session management, search, and delete drawer
│   │   ├── SplashScreen.tsx     # Startup brand intro screen with auto-dismiss
│   │   ├── TelemetryBar.tsx     # Real-time hardware compute, speed, and latency status bar
│   │   ├── TwitterProfileModal.tsx # Serafina's social profile modal with banner crossfade and GitHub, Discord & Instagram links
│   │   └── VRMCanvas.tsx        # Three.js 3D VRM humanoid avatar, Mixamo idle, look-at & physics
│   ├── constants/
│   │   └── index.ts             # System persona prompts, default models, and app constants
│   ├── lib/
│   │   ├── audio.ts             # Web Audio API sound effects and UI acoustic feedback
│   │   ├── lipSync.ts           # SpeechSynthesis phoneme-to-viseme mapping & facial articulation
│   │   ├── models.ts            # Local SLM specifications, VRAM budgets, and model catalog
│   │   ├── ollama.ts            # Ollama connectivity ping, tags enumeration, and streaming client over HTTP REST APIs
│   │   ├── prompts.ts           # System prompt sanitization and text output cleanup
│   │   ├── slmEngine.ts         # Transformers.js ONNX Web pipeline, device detection, and token streaming
│   │   └── storage.ts           # LocalStorage conversation history and configuration persistence
│   ├── types/
│   │   └── index.ts             # Core TypeScript interfaces for models, messages, and telemetry
│   ├── index.css                # Tailwind CSS styling and custom animations
│   └── main.tsx                 # React DOM root entry point
├── index.html                   # HTML entry point with metadata & OpenGraph tags
├── package.json                 # Project dependencies, scripts, and runtime engines
├── tsconfig.json                # TypeScript compiler configuration
└── vite.config.ts               # Vite bundler configuration
```

---

## 🧩 Microservices Architecture

Serafina Web is designed around decoupled, self-contained microservices and service layers that isolate specific responsibilities, maximize system reliability, and enable horizontal scaling:

- **3D Asset Delivery Microservice (`/api/vrm`)**: A streaming binary proxy service that resolves upstream humanoid VRM assets, negotiates content lengths, injects immutable caching headers (`max-age=604800`), and streams binary chunks directly to Three.js WebGL renderers while preventing cross-origin redirection blocks.
- **Animation Motion Microservice (`/api/animation/idle`)**: An autonomous asset proxy microservice dedicated to fetching, streaming, and caching Mixamo skeletal animation binary buffers (`.fbx`) for humanoid skeletal retargeting.
- **Ollama Gateway & Proxy Microservice (`/api/ollama/*`)**: An intermediary service layer that proxies health checks (`/api/ollama/ping`) and Server-Sent Events chat completions (`/api/ollama/chat`) between the client and remote/local Ollama clusters. It handles CORS normalization, ngrok interstitial bypasses, model tag inspection, and upstream error translation.
- **Client Edge SLM Microservice**: Fully autonomous client-side neural execution microservice operating inside Web Workers/WebGPU runtimes via Hugging Face Transformers.js and ONNX Runtime Web. It handles tokenizer encoding, weight caching in Origin Private File System (OPFS), and token streaming with zero external server dependency.
- **Phonetic Lip-Sync & Viseme Event Engine**: A client-side decoupled event processor mapping Web Speech API phoneme boundaries to Three.js VRM blend shapes in real-time.

---

## 🔌 APIs & Endpoint Specifications

The application utilizes clean HTTP and REST APIs alongside browser-native interface standards:

### Backend REST APIs (HTTP / Express)
- `GET /api/health`: Health status probe returning service availability and persona metadata.
  - **Response**: `{ "status": "ok", "persona": "Serafina" }`
- `GET /api/vrm`: Binary streaming proxy delivering the 3D VRM 1.0 humanoid avatar with public immutable cache headers.
  - **Headers**: `Content-Type: application/octet-stream`, `Cache-Control: public, max-age=604800, immutable`
- `GET /api/animation/idle`: Binary streaming proxy delivering Mixamo idle skeletal animation assets (`.fbx`).
- `POST /api/ollama/ping`: Heartbeat probe assessing Ollama node connectivity, loaded model tags, and VRAM availability.
  - **Request Body**: `{ "url": "http://localhost:11434" }`
  - **Response**: `{ "online": true, "modelName": "Hudson/llama3.1-uncensored:8b", "models": [...] }`
- `POST /api/ollama/chat`: Server-Sent Events (SSE) streaming endpoint relaying conversational turns and token deltas.
  - **Request Body**: `{ "url": string, "model": string, "messages": Array<{ role: string, content: string }>, "systemPrompt": string, "maxTokens": number }`
  - **Stream Protocol**: Event-driven `data: {"text": "token"}` lines terminating in `data: {"done": true}`.

### Browser-Native Web APIs
- **Web Speech API (`SpeechSynthesis`)**: System voice synthesis engine with strict priority queuing (`Bangla`, `Bengali`, `Veena`, `Google বাংলা`, `India`) and guaranteed universal voice fallback.
- **Web Audio API**: Real-time synthesizer generating subtle tactile acoustic clicks on send and warm contralto chimes on token reception.
- **WebGPU / WebAssembly (WASM)**: Hardware-accelerated matrix multiplication for in-browser neural tensor execution.

---

## 🔒 Privacy & Offline Capability

- No conversational data, prompts, or images are transmitted to external AI servers.
- After the initial download, browser models can run **100% offline** without an internet connection, providing substantial Cloud cost optimization by eliminating per-token inference charges.
- All conversational history and settings are stored locally in your browser's IndexedDB and localStorage, independent of remote storage REST APIs.
- Model weights remain cached directly within your device's Origin Private File System (OPFS), with no telemetry or third-party tracking, ensuring microservices boundaries and containerized CI/CD builds remain lightweight.
- Client-side execution over local HTTP endpoints ensures your conversations remain confidential and private on your device.

---

## 📄 License & Intellectual Property Notice

- **Project License**: The source code and software implementation of **Serafina AI** are distributed under the [MIT License](LICENSE).
- **Original Character & Intellectual Property (IP)**: **Serafina / Seraphina**, including her name, character identity, persona directives, backstory, speech patterns, visual aesthetics, and associated creative lore, is an **Original Character (OC)** and the exclusive **Intellectual Property (IP)** of the creator. This project license applies solely to the software codebase, tools, and technical implementation. It does not grant ownership, trademark, or commercial character rights over Serafina/Seraphina as an intellectual property.


