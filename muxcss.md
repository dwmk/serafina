# Mux Design System & UI/UX Architecture (`mux.css`)

> **Extracted UI/UX specification, color tokens, and layout guidelines from Serafina.**  
> Designed to make it effortless to reproduce the exact visual aesthetics, ambient glow, themes, and interactive micro-details across any web project.

---

## 1. Design Philosophy

The **Mux Design System** combines clean modern minimalism with immersive ambient lighting:

- **Ambient Layering**: Hardware-accelerated ambient color blobs (Auroras) float behind subtle grids (`40px × 40px`), giving the application a deep, organic atmosphere.
- **Flicker-Free GPU Rendering**: Instead of expensive `filter: blur(120px)` that causes raster thrashing and backdrop flashes during DOM updates, Mux uses optimized pure **CSS radial gradients** with GPU layer promotion (`translate3d(0,0,0)` and `transform-gpu`).
- **Tactile Chat Hierarchy**: Distinct geometric separation between user bubbles (solid accent/monochrome with square top-right corner) and AI responses (glassmorphic card with hairline borders, square top-left corner, and elevation on hover).
- **Floating Input Dock**: Floating rounded bar (`rounded-3xl`) anchored to the bottom with subtle backdrop-blur and integrated action clusters.
- **Dynamic Theming via CSS Custom Properties**: All components consume CSS custom properties. Changing the entire application theme requires only updating the `data-theme` attribute on the root element.

---

## 2. Quick Start

### Option A: Direct Link or Import in HTML

```html
<link rel="stylesheet" href="./mux.css" />

<!-- Apply theme to root or body -->
<html data-theme="classic-dark">
  <body class="themed-bg themed-text">
    <!-- App layout -->
  </body>
</html>
```

### Option B: Import in React / Next.js / Vue / Svelte

```javascript
// In main.jsx, _app.tsx, or layout.tsx
import './mux.css';
```

---

## 3. Theme Presets

Mux ships with **10 curated themes** covering light, dark, pastel, seasonal, and deep high-contrast palettes:

| Theme ID | Display Name | Base Mode | Accent Color | Visual Mood |
| :--- | :--- | :--- | :--- | :--- |
| `classic-light` | **Classic Light** | Light | `#ec4899` / `#18181b` | Crisp monochrome with soft pink selection |
| `classic-dark` | **Classic Dark** | Dark | `#ec4899` / `#ffffff` | Deep obsidian `#09090b` with sleek glass layers |
| `spring-blossom` | **Spring Blossom** | Light | `#e891b0` | Warm sakura pinks, floral cream background |
| `summer-splash` | **Summer Splash** | Light | `#2196f3` | Ocean blue, refreshing cyan sky tones |
| `falling-leaves` | **Falling Leaves** | Light | `#d2691e` | Autumn amber, warm ochre, rustic crimson |
| `frosty-flakes` | **Frosty Flakes** | Light | `#4a90e2` | Crisp ice-blue, arctic silver, frosted glass |
| `cozy-christmas` | **Cozy Christmas** | Dark | `#e74c3c` | Evergreen forest `#0d1f14`, holiday red & gold |
| `holy-ramadan` | **Holy Ramadan** | Dark | `#c9a84c` | Majestic emerald `#0a1a14`, rich crescent gold |
| `canada-day` | **Canada Day** | Light | `#d52b1e` | Vivid maple red `#d52b1e`, clean snow white |
| `starry-skies` | **Starry Skies** | Dark | `#4a6fa5` | Midnight cosmic `#0b0e14`, nebula starlight |

### Switching Themes in JavaScript

```javascript
// Switch theme dynamically on the <html> tag
function setTheme(themeId) {
  document.documentElement.setAttribute('data-theme', themeId);
  localStorage.setItem('mux-theme', themeId);
}

// Example usage:
setTheme('classic-dark');
setTheme('starry-skies');
```

---

## 4. Key Design Tokens Reference

All design tokens are mapped as CSS custom properties:

```css
/* Surface & Text */
--bg-base                  /* App canvas background */
--text-base                /* Primary typography color */
--header-bg                /* Semi-transparent navigation bar */
--header-border            /* Hairline border for header */

/* Chat Bubbles */
--user-bubble-bg           /* User bubble background */
--user-bubble-text         /* User bubble text */
--ai-bubble-bg             /* AI assistant card background */
--ai-bubble-border         /* AI card border */
--ai-bubble-text           /* AI card text */
--ai-bubble-hover-bg       /* AI card background on mouse hover */
--ai-bubble-hover-border   /* AI card border on mouse hover */

/* Controls & Buttons */
--btn-bg / --btn-hover-bg  /* Standard icon / text button */
--btn-text                 /* Standard button text */
--send-btn-bg              /* Primary action / send button */
--send-btn-text            /* Primary action text */
--send-btn-hover           /* Primary action hover state */

/* Ambient & Accents */
--aurora-1                 /* Primary ambient light orb */
--aurora-2                 /* Secondary ambient light orb */
--aurora-3                 /* Accent ambient light orb */
--grid-color               /* 40px procedural grid line tint */
--accent                   /* Vibrant brand / highlight color */
--accent-bg                /* Translucent highlight background */
--selection-bg             /* Text highlight selection color */
--selection-text           /* Text highlight font color */
--overlay-bg               /* Drawer / modal backdrop scrim */

/* Drawers & Menus */
--sidebar-bg               /* Sidebar glass canvas */
--sidebar-border           /* Sidebar boundary line */
--sidebar-text             /* Sidebar primary item */
--sidebar-text-muted       /* Sidebar secondary / timestamp */
--sidebar-hover-bg         /* Hover state in drawer lists */
--sidebar-active-bg        /* Active / selected conversation */
```

---

## 5. Component HTML Snippets

### A. Ambient Background & Procedural Grid

Place this at the root of your application shell. The radial gradients provide smooth, flicker-free ambient color animations.

```html
<div class="fixed inset-0 z-0 overflow-hidden pointer-events-none" style="contain: strict;">
  <div class="themed-aurora-1 absolute -top-1/4 -left-1/4 w-[500px] h-[500px] sm:w-[600px] sm:h-[600px] rounded-full animate-aurora-1"></div>
  <div class="themed-aurora-2 absolute top-1/3 -right-1/4 w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] rounded-full animate-aurora-2"></div>
  <div class="themed-aurora-3 absolute -bottom-1/4 left-1/3 w-[450px] h-[450px] sm:w-[550px] sm:h-[550px] rounded-full animate-aurora-3"></div>
</div>

<!-- Procedural 40px Grid Pattern -->
<div class="themed-grid-bg fixed inset-0 z-0 pointer-events-none opacity-[0.03]"></div>
```

---

### B. Glassmorphism Navigation Bar

```html
<header class="themed-header sticky top-0 z-20 flex items-center gap-3 p-4 border-b backdrop-blur-xl">
  <!-- Burger Menu -->
  <button class="themed-burger p-2 rounded-lg" title="Toggle navigation">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  </button>

  <!-- Brand Title -->
  <div class="flex items-center gap-2 font-bold text-lg">
    <span class="w-2 h-2 rounded-full" style="background: var(--accent);"></span>
    <span>Serafina</span>
  </div>

  <!-- Version Dropdown Trigger -->
  <div class="relative">
    <button class="themed-version-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium">
      <span>v2.5</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 10l5 5 5-5z" />
      </svg>
    </button>
  </div>

  <!-- Status Chip (Right) -->
  <div class="ml-auto flex items-center gap-2">
    <div class="themed-online flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold">
      <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
      <span>Connected</span>
    </div>
  </div>
</header>
```

---

### C. Chat Message Thread (User & AI Cards)

```html
<div class="space-y-6 max-w-3xl mx-auto px-4 py-6">

  <!-- 1. User Message (Right Aligned) -->
  <div class="flex justify-end">
    <div class="themed-user-bubble max-w-[80%] px-5 py-3 rounded-2xl rounded-tr-sm text-sm sm:text-base leading-relaxed shadow-sm">
      Can you summarize our roadmap and give me the next action steps?
    </div>
  </div>

  <!-- 2. AI Message (Left Aligned with Avatar) -->
  <div class="flex items-start gap-3 justify-start">
    <!-- Avatar Icon Box -->
    <div class="themed-logo-box w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs">
      <span class="text-xs font-bold" style="color: var(--accent);">S</span>
    </div>

    <!-- Bubble Card with Subtle Elevation on Hover -->
    <div class="themed-ai-bubble max-w-[80%] px-5 py-3 rounded-2xl rounded-tl-sm text-sm sm:text-base leading-relaxed">
      <p class="mb-2">Here is your roadmap breakdown:</p>
      
      <blockquote class="themed-quote">
        Phase 1: Architecture audit & performance stabilization.
      </blockquote>

      <p class="mt-2">
        Inline code looks like <code class="themed-code-inline">npm run build</code>, and formulas render cleanly via KaTeX.
      </p>
    </div>
  </div>

</div>
```

---

### D. Floating Bottom Input Bar

```html
<footer class="p-3 sm:p-4 max-w-3xl mx-auto w-full">
  <div class="themed-input flex items-end gap-2 backdrop-blur-xl border rounded-3xl shadow-lg pl-4 pr-2 py-2">
    
    <!-- Action/Add Attachment Button -->
    <button class="themed-btn p-2 rounded-full mb-0.5" title="Attachments">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>

    <!-- Auto-resizing Textarea -->
    <textarea 
      rows="1" 
      placeholder="Message Serafina..." 
      class="flex-1 bg-transparent resize-none outline-none text-sm sm:text-base max-h-36 py-2 px-1 text-inherit"
    ></textarea>

    <!-- Send Button (Circle) -->
    <button class="themed-send-btn w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-full flex items-center justify-center shadow-md">
      <svg width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
        <path d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"/>
      </svg>
    </button>

  </div>
</footer>
```

---

### E. Slide-Over Drawers (Sidebar & Themes)

```html
<!-- Backdrop Scrim -->
<div class="fixed inset-0 z-40" style="background: var(--overlay-bg);" onclick="closeSidebar()"></div>

<!-- Slide Drawer Panel -->
<aside class="themed-sidebar-panel fixed top-0 left-0 h-full w-72 z-50 flex flex-col border-r shadow-2xl">
  
  <!-- Header -->
  <div class="p-4 flex items-center justify-between border-b border-inherit">
    <span class="font-bold text-lg themed-sidebar-text">Conversations</span>
    <button class="themed-sidebar-hover p-1.5 rounded-lg themed-sidebar-secondary" onclick="closeSidebar()">✕</button>
  </div>

  <!-- New Chat Button -->
  <div class="p-3">
    <button class="themed-new-chat w-full flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm shadow-sm">
      <span>+ New chat</span>
    </button>
  </div>

  <!-- Conversation List -->
  <div class="flex-1 overflow-y-auto px-3 space-y-1">
    <button class="themed-sidebar-active w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between">
      <span class="truncate">Sprint Planning v2.5</span>
    </button>
    <button class="themed-sidebar-hover w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between themed-sidebar-text">
      <span class="truncate">Drafting Release Notes</span>
    </button>
  </div>

  <!-- Footer -->
  <div class="p-3 border-t border-inherit text-xs themed-sidebar-muted text-center">
    © Senturisk 2026
  </div>
</aside>
```

---

## 6. Performance Best Practices

1. **Avoid `backdrop-filter: blur(...)` Over Moving Layers**:
   Animating elements with high-radius backdrop filters over large viewport areas can force GPU raster recreation. Always use solid alpha blends (`rgba(...)`) or static headers for backdrop blurs.
2. **Radial Gradients vs. CSS Blur**:
   Notice that `.themed-aurora-1/2/3` utilize `radial-gradient(circle closest-side, var(--aurora-1) 0%, ..., transparent 100%)`. This creates atmospheric lighting without triggering Gaussian blur passes on every GPU draw call.
3. **Layer Promotion & Compositing Containment**:
   Apply `contain: strict;` on background parent containers to isolate layout recalculations from the scrollable chat list.
4. **Hardware Acceleration**:
   Always animate drawers with `transform: translate3d(...)` or Framer Motion / CSS transforms rather than `left`/`right` or `margin` adjustments.
