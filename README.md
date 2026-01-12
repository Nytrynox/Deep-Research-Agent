# Deep Research Agent

An autonomous multi-agent research system powered by Google Gemini 3.

[![Gemini](https://img.shields.io/badge/Gemini_3-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)
[![Tavily](https://img.shields.io/badge/Tavily_AI-FF6B35?style=flat)](https://tavily.com/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

---

## Overview

Deep Research Agent conducts comprehensive research by orchestrating multiple AI agents that search, analyze, and synthesize information from 7 different sources. Built for the Gemini API Developer Competition.

**7 sources. 1 answer. Powered by Gemini 3.**

---

## Features

| Feature | Description |
|---------|-------------|
| Multi-Agent System | Specialized agents for planning, searching, analyzing, and reporting |
| 7 Data Sources | Tavily, DuckDuckGo, Wikipedia, ArXiv, Hacker News, Reddit, GitHub |
| Real-time Streaming | Live updates via WebSocket as research progresses |
| Thought Visualization | See the AI reasoning process in real-time |
| Research Depth Control | Quick, Standard, or Deep research modes |
| Source Previews | View URLs and snippets for each discovered source |

---

## Architecture

```
+----------------------------------------------------------+
|                   DEEP RESEARCH AGENT                     |
+----------------------------------------------------------+
|                                                           |
|   Planner --> Searcher --> Analyzer --> Reporter          |
|                                                           |
|                    +-------------+                        |
|                    |  Gemini 3   |                        |
|                    +-------------+                        |
|                                                           |
+----------------------------------------------------------+
|                     DATA SOURCES                          |
|                                                           |
|   Tavily  DuckDuckGo  Wikipedia  ArXiv  HN  Reddit  GitHub|
|                                                           |
+----------------------------------------------------------+
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| AI | Google Gemini 3 (gemini-3-flash-preview) |
| Search | Tavily AI Search API |
| Backend | Node.js, Express, WebSocket |
| Frontend | React, Vite, Tailwind CSS |
| Animation | Framer Motion |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Gemini API Key](https://aistudio.google.com/)
- [Tavily API Key](https://tavily.com/) (optional)

### Installation

```bash
git clone https://github.com/Nytrynox/Deep-Research-Agent.git
cd Deep-Research-Agent

npm install
cd client && npm install && cd ..

cp .env.example .env
```

Add your API keys to `.env`:

```
GEMINI_API_KEY=your_gemini_key
TAVILY_API_KEY=your_tavily_key
```

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Usage

1. Enter a research topic
2. Select depth: Quick / Standard / Deep
3. Click Research
4. View real-time progress and results

---

## API Events

| Event | Direction | Description |
|-------|-----------|-------------|
| research | Client to Server | Start research |
| status | Server to Client | Phase updates |
| thought | Server to Client | Agent reasoning |
| source | Server to Client | Source discovered |
| plan | Server to Client | Research plan |
| complete | Server to Client | Research complete |

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built for the Gemini API Developer Competition</strong>
</p>
