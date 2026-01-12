# 🔬 Deep Research Agent

> **An Autonomous Multi-Agent Research System Powered by Gemini 3**

[![Gemini 3](https://img.shields.io/badge/Powered%20by-Gemini%203-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Built for Hackathon](https://img.shields.io/badge/Built%20for-Gemini%203%20Hackathon-FF6B6B?style=for-the-badge)](https://gemini3.devpost.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 🎯 What is Deep Research Agent?

Deep Research Agent is an **autonomous AI research system** that goes far beyond simple chatbots or basic RAG implementations. It employs a sophisticated **multi-agent architecture** where specialized AI agents collaborate to conduct comprehensive research across multiple sources.

### Built for the Action Era

This project directly addresses the hackathon's strategic tracks:

- **🧠 Marathon Agent Track**: Autonomous multi-step research with self-correction, knowledge gap detection, and thought signatures for reasoning continuity
- **Multi-Agent Orchestration**: Specialized agents (Planner, Searcher, Analyzer, Synthesizer, Reporter) working in concert
- **Not a Simple Wrapper**: Robust system architecture with 6 real data sources, real-time WebSocket updates, and comprehensive research analytics

---

## ✨ Key Features

### 🧠 Thought Signatures (Chain of Thought)
Visualize the AI's reasoning process in real-time:
- See each agent's decision-making steps
- Track the research flow from planning to completion
- Understand WHY the AI made specific choices

### 📊 Research Analytics Dashboard
Comprehensive metrics for research quality:
- Overall reliability score (weighted by source credibility)
- Source distribution visualization
- Reliability breakdown (High/Medium/Low)
- Coverage analysis across source types

### 🔍 Multi-Source Search (6 FREE APIs)
No API keys required - all sources are freely accessible:
- **DuckDuckGo** - General web search
- **Wikipedia** - Encyclopedia articles
- **ArXiv** - Academic papers & research
- **Hacker News** - Tech news & discussions
- **Reddit** - Community discussions
- **GitHub** - Code & technical docs

### 📝 Comprehensive Reports
AI-generated research reports with:
- Executive summary
- Key findings organized by theme
- Source analysis and citations
- Consensus & debates identification
- Confidence assessments
- Follow-up questions

### 💾 Research History (Persistence)
Your research is automatically saved:
- Resume any past session instantly
- View research timeline
- Export and share findings

### 🔄 Knowledge Gap Detection
Self-correcting research system:
- Automatically identifies information gaps
- Suggests additional research queries
- Enables iterative refinement loops

### 📑 Citation Export
Export citations in multiple formats:
- APA format
- MLA format
- BibTeX for LaTeX users

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DEEP RESEARCH AGENT                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ Planner │───▶│ Searcher│───▶│ Analyzer│───▶│ Writer  │  │
│  │  Agent  │    │  Agent  │    │  Agent  │    │  Agent  │  │
│  └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘  │
│       │              │              │              │        │
│       ▼              ▼              ▼              ▼        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              GEMINI 3 PRO / FLASH                    │   │
│  │    (State-of-the-art reasoning & multimodal)        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    DATA SOURCES                              │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐    │
│  │ DDG │  │Wiki │  │ArXiv│  │ HN  │  │Reddit│ │GitHub│    │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Agent Workflow

1. **Planner Agent** 🎯
   - Analyzes the research query
   - Creates strategic search plan
   - Identifies key aspects to investigate

2. **Searcher Agent** 🔍
   - Executes parallel searches across 6 sources
   - Deduplicates and ranks results
   - Assesses initial source reliability

3. **Analyzer Agent** 🧠
   - Deep analysis of each source
   - Extracts key facts, claims, and evidence
   - Evaluates source credibility

4. **Synthesizer Agent** 🔄
   - Cross-references findings
   - Identifies consensus and contradictions
   - Detects knowledge gaps

5. **Reporter Agent** 📝
   - Generates comprehensive report
   - Creates citations and references
   - Suggests follow-up questions

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **AI** | Google Gemini 3 (`gemini-3-pro-preview`, `gemini-3-flash-preview`) |
| **Backend** | Node.js, Express, WebSocket (ws) |
| **Frontend** | React 18, Vite 5, TailwindCSS |
| **Animation** | Framer Motion |
| **Icons** | Lucide React |
| **Data** | 6 FREE APIs (no keys required) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/deep-research-agent.git
cd deep-research-agent

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start the application
npm run dev
```

### Open in Browser
```
http://localhost:5173
```

---

## 📖 Usage Guide

### Basic Research
1. Enter your research topic in the search bar
2. Select research depth:
   - **Quick** (~30 sec): 4 search queries, basic analysis
   - **Standard** (~1 min): 6 search queries, thorough analysis
   - **Deep** (~2 min): 10 search queries, comprehensive analysis
3. Click "Research" and watch the AI work in real-time

### Advanced Features

#### Thought Signatures
- Expand the "Thought Signatures" panel to see AI reasoning
- Track which agent is active and what decisions it's making

#### Research Analytics
- Click the "Analytics" tab in results
- View reliability scores and source distribution

#### Citation Export
- Click "Cite" button on any completed research
- Choose format (APA, MLA, BibTeX)
- Copy to clipboard

#### Research History
- Click "History" in the header
- Load any previous research session
- Clear history when needed

#### Knowledge Gap Research
- After research completes, see "Knowledge Gaps Detected"
- Click "Research" on any gap to investigate further

---

## 🎨 Design Philosophy

### Google/Gemini White Theme
- Clean, minimalist white background
- Google brand colors (Blue, Red, Yellow, Green)
- Official Gemini star logo with gradient
- Google Sans-inspired typography

### Professional UI
- No emojis - professional Lucide icons throughout
- Smooth Framer Motion animations
- Responsive design for all screen sizes
- Real-time WebSocket updates

---

## 🔧 API Endpoints

### WebSocket Events (Port 3001)

| Event | Direction | Description |
|-------|-----------|-------------|
| `check_api` | Client → Server | Check API configuration |
| `api_status` | Server → Client | API configuration status |
| `research` | Client → Server | Start research |
| `status` | Server → Client | Phase updates |
| `thought` | Server → Client | Agent thought/decision |
| `source` | Server → Client | New source discovered |
| `plan` | Server → Client | Research plan created |
| `complete` | Server → Client | Research complete |
| `error` | Server → Client | Error occurred |

---

## 📊 How It Addresses Judging Criteria

### Technical Execution (40%)
- ✅ Uses Gemini 3 API (gemini-3-pro-preview, gemini-3-flash-preview)
- ✅ Multi-agent architecture with specialized agents
- ✅ Real-time WebSocket communication
- ✅ 6 integrated data sources
- ✅ Clean, functional codebase

### Potential Impact (20%)
- ✅ Solves real problem: comprehensive research is time-consuming
- ✅ Broad market: students, researchers, professionals, journalists
- ✅ Time savings: hours of research condensed to minutes
- ✅ Quality improvement: multi-source verification reduces bias

### Innovation / Wow Factor (30%)
- ✅ Thought Signatures: visualize AI reasoning (novel UX)
- ✅ Knowledge Gap Detection: self-correcting research
- ✅ Multi-agent orchestration: not just a prompt wrapper
- ✅ Research Analytics: quantified credibility metrics

### Presentation / Demo (10%)
- ✅ Clear problem statement: research is hard
- ✅ Live demo with real searches
- ✅ Architecture diagram provided
- ✅ Comprehensive documentation

---

## 🔒 Privacy & Ethics

- **No data storage**: Research is only persisted locally in browser
- **Free APIs only**: No paid services or rate-limited APIs
- **Transparent sources**: All citations clearly attributed
- **No medical advice**: Not designed for health-related queries

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Google DeepMind for Gemini 3 API
- Devpost for hosting the hackathon
- Open source community for tools and libraries

---

## 👤 Author

Built with ❤️ for the **Gemini 3 Hackathon**

---

<p align="center">
  <img src="https://ai.google.dev/static/images/gemini-logo.svg" width="100" alt="Gemini" />
  <br />
  <strong>Powered by Google Gemini 3</strong>
</p>
