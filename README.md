# 🔮 Lilith Sádica — Autonomous AI Agent Operating System, Neural Dashboard & Real-Time Dual-Voice Engine

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Google_GenAI_2.8-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google GenAI" />
  <img src="https://img.shields.io/badge/Telegram_Telegraf-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram Bot" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/OKX_Trading_CLI-000000?style=for-the-badge&logo=okx&logoColor=white" alt="OKX CLI" />
  <img src="https://img.shields.io/badge/Google_Ads_API-4285F4?style=for-the-badge&logo=googleads&logoColor=white" alt="Google Ads" />
</p>

---

## 📌 Executive Summary

**Lilith Sádica** is a high-autonomy personal AI agent operating system designed with an unapologetic, razor-sharp psychological persona. 

Beyond conversational NLP, Lilith serves as an executive copilot capable of perceiving, deciding, and executing cross-platform tasks in real time: managing crypto trading accounts on OKX, optimizing Google Ads budgets, drafting and publishing structured Google Docs dossiers, processing PIX payments, scraping real-time market intelligence, and interacting through an ultra-low latency, bidirectional dual-voice neural interface.

---

## 🏗️ Architecture & Neural Tool Registry

Lilith is built on an extensible tool-execution architecture centered around Google GenAI (`@google/genai` and `@google/generative-ai`), powered by a continuous action-evaluation loop (`MAX_TOOL_LOOPS = 10`):

```
                                +-----------------------------+
                                |  Telegram Bot / Web / Voice |
                                +-----------------------------+
                                               │
                                               ▼
                              +---------------------------------+
                              |  AI Reasoning Engine (Processor)|
                              |     Google Gemini 2.5 / Flash   |
                              +---------------------------------+
                                               │
                                  ┌────────────┴────────────┐
                                  ▼                         ▼
                         [Direct Answer]          [Function Call Trigger]
                                                            │
                     ┌──────────────────────────────────────┴──────────────────────────────────────┐
                     │                                                                             │
                     ▼                                                                             ▼
           ┌───────────────────────┐                                                     ┌───────────────────────┐
           │   System & Automation │                                                     │ Financial & Marketing │
           ├───────────────────────┤                                                     ├───────────────────────┤
           │ • Google Docs API     │                                                     │ • OKX Crypto CLI      │
           │ • Puppeteer Scraping  │                                                     │ • Google Ads API      │
           │ • Supabase Vector DB  │                                                     │ • GGPIX Gateway       │
           │ • Obsidian Vault Sync │                                                     │ • Ad Performance / ROI│
           └───────────────────────┘                                                     └───────────────────────┘
                     │                                                                             │
                     └──────────────────────────────────────┬──────────────────────────────────────┘
                                                            │
                                                            ▼
                                           +---------------------------------+
                                           | Dynamic Neural Dashboard / Audio|
                                           +---------------------------------+
```

### 1. Unified Action Registry
The agent features 12 specialized module packages exposing dozens of executable functions:
- **Ads Module (`ads/`):** Live telemetry from `google-ads-api`, monitoring conversions, ROI, ROAS, click costs, and budget allocations.
- **Crypto Trading (`okx/`):** Non-blocking execution of OKX CLI operations for spot/futures balance checks, trade execution, and portfolio balance audits.
- **Office & Documents (`system/services/google-docs-service.ts`):** Automated creation and templating of business reports, research dossiers, and client summaries directly inside Google Drive.
- **Knowledge Base (`obsidian/` & `supabase/`):** Bi-directional reading and writing of personal notes in Markdown and Supabase vector embeddings.
- **Payments (`payments/`):** Instant PIX invoice generation and QR code payload dispatching via GGPIX gateway.
- **Browser Automation (`browser/` & `scraping/`):** Puppeteer integration for real-time web research, content digestion, and extraction.

### 2. Low-Latency Dual-Voice System (`useDualVoice`)
- Features simultaneous multi-agent audio streaming through WebSockets and the Web Audio API.
- Orchestrates turn-taking between dual personas (**Lilith** and **Zephyr**) with real-time waveform transcription, interruption detection, and dynamic buffer queuing.

### 3. Neural Command Center (Next.js 16 + React 19)
- Real-time diagnostic interface with dynamic cards (`CommandCenter`, `NeuralStream`, `ProfitChart`).
- Live ROI/ROAS performance indicators, audio activity monitors, and dynamic widget layout reconfiguration.

---

## ✨ Key Capabilities

| Domain | Integrated Capabilities |
|---|---|
| 🎙️ **Real-Time Audio** | Bidirectional voice interaction using Google GenAI voice endpoints and Web Audio buffers |
| 📈 **Crypto & Capital** | Direct, sandboxed OKX CLI command dispatching and live balance reporting |
| 📊 **Marketing Analytics** | Google Ads API reporting (Clicks, Cost, Conversions, ROAS, Campaign Health) |
| 📑 **Document Automation** | Google Docs API OAuth token cycling and automated report generation |
| 🧠 **Persona & Tone** | Razor-sharp, sarcastic, intellectually uncompromising persona backed by custom system instructions |
| 💬 **Multichannel Support** | Accessible seamlessly via Telegraf Telegram bot or responsive Next.js web application |

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Framework & Engine** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling & UI** | Tailwind CSS v4, Lucide React, Radix UI Primitives |
| **Artificial Intelligence** | Google GenAI SDK (`@google/genai`, `@google/generative-ai`) |
| **Charts & Audio** | Lightweight Charts, Recharts, Web Audio API, `google-tts-api` |
| **Databases & Cloud** | Supabase (`@supabase/supabase-js`), Google Drive / Docs API |
| **Process Daemon** | PM2 Process Manager (`ecosystem.config.js`), Node.js 20+ |
| **Integrations** | Telegraf (Telegram), Google Ads API, Puppeteer, Axios |

---

## 📂 Repository Structure

```
lilith-sadica/
├── src/
│   ├── actions/               # Server Actions (Agent state, layout manipulation)
│   ├── app/                   # Next.js 16 App Router (Dashboard, API routes, Auth)
│   │   ├── api/               # Next.js REST and WebSocket proxies
│   │   ├── dashboard/         # Real-time neural telemetry overview
│   │   └── page.tsx           # Voice interaction and chat frontend
│   ├── components/            # UI components (CommandCenter, NeuralStream, ProfitChart)
│   ├── contexts/              # Dashboard context and state distribution
│   ├── hooks/                 # `useDualVoice`, `useLilithVoice`, and audio capture
│   ├── lib/                   # Supabase, OKX, Telegram, and environment definitions
│   └── modules/               # Tool Registry & Autonomous Services
│       ├── ads/               # Google Ads reporting & optimization
│       ├── ai/                # Gemini core processor and chat context
│       ├── browser/           # Headless Puppeteer browsing
│       ├── communication/     # Chat history & conversation persistence
│       ├── obsidian/          # Markdown knowledge base tools
│       ├── okx/               # OKX trading CLI runner
│       ├── payments/          # PIX payments and billing
│       ├── scraping/          # Live web data extractors
│       ├── system/            # Google Docs API & app state services
│       └── voice/             # Real-time TTS synthesis tools
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ and npm
- Google Cloud Platform project with Google Docs and Google Ads API enabled
- Gemini API Key
- Supabase Project URL & Anon Key
- Telegram Bot Token (from BotFather)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/felipedutrag/lilith-sadica.git
   cd lilith-sadica
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create `.env.local` containing:
   ```env
   GEMINI_API_KEY="your-gemini-key"
   TELEGRAM_BOT_TOKEN="your-telegram-token"
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-key"
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   GOOGLE_DOCS_REFRESH_TOKEN="your-docs-refresh-token"
   GOOGLE_ADS_REFRESH_TOKEN="your-ads-refresh-token"
   ```

4. **Launch the development environment:**
   ```bash
   npm run dev
   ```

5. **(Optional) Run as a continuous background daemon with PM2:**
   ```bash
   pm2 start ecosystem.config.js
   ```

---

## 👤 Author

Developed by **Felipe Dutra**  
- **GitHub:** [@felipedutrag](https://github.com/felipedutrag)  
- **Email:** [felipedutra@outlook.com](mailto:felipedutra@outlook.com)
