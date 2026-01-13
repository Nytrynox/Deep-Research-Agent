import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Send, Loader2, Globe, BookOpen, GraduationCap,
  MessageCircle, Code2, Newspaper, ChevronDown, ChevronRight,
  Star, ExternalLink, Clock, Layers, Brain, Sparkles,
  AlertCircle, CheckCircle2, Zap, Target, FileText,
  RefreshCw, Copy, Trash2, Plus, History, X, Link2, Check
} from 'lucide-react';

// Tavily Logo SVG
const TavilyLogo = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#5D5CDE"/>
    <path d="M2 17l10 5 10-5" stroke="#5D5CDE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12l10 5 10-5" stroke="#5D5CDE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ============================================
// GEMINI LOGO SVG
// ============================================
const GeminiLogo = ({ className, animate = false }) => (
  <svg 
    className={`${className} ${animate ? 'animate-spin-slow' : ''}`} 
    viewBox="0 0 54 54" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      fillRule="evenodd" 
      clipRule="evenodd" 
      d="M27 0C27 14.9117 39.0883 27 54 27C39.0883 27 27 39.0883 27 54C27 39.0883 14.9117 27 0 27C14.9117 27 27 14.9117 27 0Z" 
      fill="url(#gemini-gradient)"
    />
    <defs>
      <linearGradient id="gemini-gradient" x1="0" y1="0" x2="54" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4285F4"/>
        <stop offset="0.33" stopColor="#9B72CB"/>
        <stop offset="0.66" stopColor="#D96570"/>
        <stop offset="1" stopColor="#F49C46"/>
      </linearGradient>
    </defs>
  </svg>
);

// ============================================
// SOURCE ICONS
// ============================================
const SourceIcon = ({ source }) => {
  const icons = {
    'DuckDuckGo': <Globe className="w-4 h-4" />,
    'Wikipedia': <BookOpen className="w-4 h-4" />,
    'ArXiv': <GraduationCap className="w-4 h-4" />,
    'Hacker News': <Newspaper className="w-4 h-4" />,
    'Reddit': <MessageCircle className="w-4 h-4" />,
    'GitHub': <Code2 className="w-4 h-4" />,
    'Tavily': <TavilyLogo className="w-4 h-4" />
  };
  return icons[source] || <Globe className="w-4 h-4" />;
};

const sourceColors = {
  'DuckDuckGo': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Wikipedia': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'ArXiv': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Hacker News': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Reddit': 'bg-red-500/20 text-red-400 border-red-500/30',
  'GitHub': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  'Tavily': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
};

// ============================================
// RESEARCH DEPTH OPTIONS
// ============================================
const depthOptions = [
  { id: 'quick', label: 'Quick', desc: '4 queries • ~30s', icon: Zap },
  { id: 'standard', label: 'Standard', desc: '6 queries • ~1min', icon: Target },
  { id: 'deep', label: 'Deep', desc: '10 queries • ~2min', icon: Layers }
];

// ============================================
// MAIN APP
// ============================================
function App() {
  // Connection & API state
  const [isConnected, setIsConnected] = useState(false);
  const [isApiConfigured, setIsApiConfigured] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Research state
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState('standard');
  const [isResearching, setIsResearching] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Research data
  const [plan, setPlan] = useState(null);
  const [thoughts, setThoughts] = useState([]);
  const [sources, setSources] = useState([]);
  const [findings, setFindings] = useState([]);
  const [results, setResults] = useState(null);

  // Chat history (persisted in localStorage)
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  // UI state
  const [copySuccess, setCopySuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    thoughts: true,
    sources: true,
    findings: false
  });

  // Refs
  const socketRef = useRef(null);
  const resultsEndRef = useRef(null);
  const inputRef = useRef(null);

  // WebSocket URL - use environment variable or fallback
  const WS_URL = import.meta.env.PROD 
    ? 'wss://deep-research-agent-1-h9f2.onrender.com'
    : 'ws://localhost:3001';

  // Load chat history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gemini-research-history');
    if (saved) {
      try {
        setChatHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('gemini-research-history', JSON.stringify(chatHistory.slice(-20)));
    }
  }, [chatHistory]);

  // Auto-scroll to results
  useEffect(() => {
    if (results || thoughts.length > 0) {
      resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [results, thoughts]);

  // Reset research state
  const resetResearch = useCallback(() => {
    setPlan(null);
    setThoughts([]);
    setSources([]);
    setFindings([]);
    setResults(null);
    setCurrentPhase(null);
    setStatusMessage('');
    setIsResearching(false);
  }, []);

  // Start new research
  const startResearch = useCallback(() => {
    if (!query.trim() || isResearching) return;

    // Reset previous research
    resetResearch();
    setIsResearching(true);

    // Create WebSocket connection
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionError(null);
      
      // Send research request
      ws.send(JSON.stringify({
        type: 'research',
        query: query.trim(),
        depth: depth
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            setIsApiConfigured(data.apiConfigured);
            break;

          case 'started':
            setCurrentPhase('starting');
            setStatusMessage('Research started...');
            break;

          case 'status':
            setCurrentPhase(data.phase);
            setStatusMessage(data.message);
            break;

          case 'plan':
            setPlan(data.plan);
            setCurrentPhase('planning');
            break;

          case 'thought':
            setThoughts(prev => [...prev, { 
              ...data, 
              id: Date.now() + Math.random(),
              timestamp: new Date() 
            }]);
            break;

          case 'source':
            setSources(prev => {
              const source = data.source;
              // Check for duplicates
              if (prev.some(s => s.url === source.url)) return prev;
              return [...prev, { ...source, id: Date.now() + Math.random() }];
            });
            break;

          case 'finding':
            setFindings(prev => [...prev, { 
              ...data, 
              id: Date.now() + Math.random() 
            }]);
            break;

          case 'complete':
            setResults(data.results);
            setIsResearching(false);
            setCurrentPhase('complete');
            setStatusMessage('Research complete!');
            
            // Save to chat history
            const chatEntry = {
              id: Date.now(),
              query: query.trim(),
              timestamp: new Date().toISOString(),
              depth,
              results: data.results
            };
            setChatHistory(prev => [...prev, chatEntry]);
            setCurrentChatId(chatEntry.id);
            
            ws.close();
            break;

          case 'error':
            setConnectionError(data.error);
            setIsResearching(false);
            ws.close();
            break;
        }
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    };

    ws.onerror = () => {
      setConnectionError('Failed to connect to research server. Make sure the server is running.');
      setIsResearching(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };
  }, [query, depth, isResearching, resetResearch]);

  // Stop research
  const stopResearch = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: 'stop' }));
      socketRef.current.close();
    }
    setIsResearching(false);
    setStatusMessage('Research stopped');
  }, []);

  // Copy report to clipboard
  const copyReport = useCallback(async () => {
    if (results?.report?.markdown) {
      try {
        await navigator.clipboard.writeText(results.report.markdown);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  }, [results]);

  // Regenerate research
  const regenerateResearch = useCallback(() => {
    if (results?.query || query) {
      const searchQuery = results?.query || query;
      setQuery(searchQuery);
      resetResearch();
      // Small delay then start research
      setTimeout(() => {
        startResearch();
      }, 100);
    }
  }, [results, query, resetResearch]);

  // Load previous chat
  const loadChat = useCallback((chat) => {
    setQuery(chat.query);
    setResults(chat.results);
    setCurrentChatId(chat.id);
    setSources(chat.results?.sources || []);
    setThoughts([]);
    setFindings([]);
    setPlan(null);
    setIsResearching(false);
    setCurrentPhase('complete');
  }, []);

  // Delete chat from history
  const deleteChat = useCallback((chatId, e) => {
    e.stopPropagation();
    setChatHistory(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      resetResearch();
      setQuery('');
      setCurrentChatId(null);
    }
  }, [currentChatId, resetResearch]);

  // New research
  const newResearch = useCallback(() => {
    resetResearch();
    setQuery('');
    setCurrentChatId(null);
    inputRef.current?.focus();
  }, [resetResearch]);

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Handle key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      startResearch();
    }
  };

  return (
    <div className="min-h-screen bg-gemini-bg text-gray-100 font-sans">
      {/* Background gradient effect */}
      <div className="fixed inset-0 bg-gradient-radial from-blue-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 flex h-screen">
        {/* Sidebar - Sources & Info */}
        <aside className="w-72 bg-gemini-surface border-r border-gemini-border flex flex-col">
          {/* Logo & Title */}
          <div className="p-5 border-b border-gemini-border">
            <div className="flex items-center gap-3">
              <GeminiLogo className="w-10 h-10" />
              <div>
                <h1 className="text-lg font-bold text-white">Deep Research</h1>
                <p className="text-xs text-gray-500">Powered by Gemini 3</p>
              </div>
            </div>
          </div>

          {/* Data Sources */}
          <div className="p-4">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <Globe size={12} />
              Data Sources (7)
            </h3>
            <div className="space-y-1.5">
              {[
                { name: 'Tavily', desc: 'AI Search API', icon: 'tavily', color: 'text-indigo-400' },
                { name: 'DuckDuckGo', desc: 'Web Search', icon: Globe, color: 'text-orange-400' },
                { name: 'Wikipedia', desc: 'Encyclopedia', icon: BookOpen, color: 'text-blue-400' },
                { name: 'ArXiv', desc: 'Academic Papers', icon: GraduationCap, color: 'text-purple-400' },
                { name: 'Hacker News', desc: 'Tech News', icon: Newspaper, color: 'text-amber-400' },
                { name: 'Reddit', desc: 'Discussions', icon: MessageCircle, color: 'text-red-400' },
                { name: 'GitHub', desc: 'Code & Repos', icon: Code2, color: 'text-gray-300' }
              ].map((source) => (
                <div key={source.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gemini-border/50 transition-colors">
                  <div className={`p-1.5 rounded-lg bg-gemini-bg ${source.color}`}>
                    {source.icon === 'tavily' ? <TavilyLogo className="w-4 h-4" /> : <source.icon size={14} />}
                  </div>
                  <div>
                    <div className="text-sm text-gray-200">{source.name}</div>
                    <div className="text-xs text-gray-500">{source.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="p-4 border-t border-gemini-border">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <Sparkles size={12} />
              Features
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 size={14} className="text-green-400" />
                Multi-source aggregation
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 size={14} className="text-green-400" />
                AI-powered synthesis
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 size={14} className="text-green-400" />
                Source reliability scoring
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 size={14} className="text-green-400" />
                Follow-up questions
              </div>
            </div>
          </div>

          {/* API Status */}
          <div className="mt-auto p-4 border-t border-gemini-border">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${isApiConfigured ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {isApiConfigured ? 'Gemini + Tavily Ready' : 'API Not Configured'}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 flex items-center justify-between px-6 border-b border-gemini-border bg-gemini-surface/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <GeminiLogo className="w-8 h-8" />
              <div>
                <h1 className="text-lg font-semibold text-white">Deep Research</h1>
                <p className="text-xs text-gray-500">Powered by Gemini 3</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isResearching && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-full">
                  <Loader2 size={14} className="animate-spin text-blue-400" />
                  <span className="text-sm text-blue-300">{statusMessage || 'Researching...'}</span>
                </div>
              )}
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto px-6 py-8">
              
              {/* Welcome State */}
              {!results && !isResearching && thoughts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <GeminiLogo className="w-20 h-20 mx-auto mb-8" />
                  <h2 className="text-4xl font-medium mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Deep Research Agent
                  </h2>
                  <p className="text-gray-400 text-lg mb-8 max-w-lg mx-auto">
                    Multi-source research powered by AI. Search across DuckDuckGo, Wikipedia, ArXiv, Hacker News, Reddit, and GitHub.
                  </p>
                  
                  {/* Quick suggestions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto mt-8">
                    {[
                      'Latest advancements in quantum computing 2025',
                      'How does transformer architecture work?',
                      'Best practices for React performance optimization',
                      'History and future of space exploration'
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(suggestion)}
                        className="text-left px-4 py-3 bg-gemini-surface hover:bg-gemini-border rounded-xl text-sm text-gray-300 transition-colors border border-gemini-border"
                      >
                        <Search size={14} className="inline mr-2 text-gray-500" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Error Display */}
              {connectionError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium">Error</p>
                    <p className="text-red-300/80 text-sm mt-1">{connectionError}</p>
                  </div>
                  <button 
                    onClick={() => setConnectionError(null)} 
                    className="ml-auto text-red-400 hover:text-red-300"
                  >
                    <X size={18} />
                  </button>
                </motion.div>
              )}

              {/* Research Plan */}
              {plan && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-gemini-surface rounded-xl border border-gemini-border"
                >
                  <div className="flex items-center gap-2 mb-3 text-blue-400">
                    <Brain size={18} />
                    <span className="font-medium">Research Plan</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300"><span className="text-gray-500">Topic:</span> {plan.mainTopic}</p>
                    <p className="text-gray-300"><span className="text-gray-500">Goal:</span> {plan.researchGoal}</p>
                    {plan.searchQueries && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {plan.searchQueries.map((q, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-300 rounded-full text-xs border border-blue-500/20">
                            {q}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Live Thoughts Stream */}
              {thoughts.length > 0 && (
                <div className="mb-6">
                  <button
                    onClick={() => toggleSection('thoughts')}
                    className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-400 hover:text-gray-300"
                  >
                    {expandedSections.thoughts ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Sparkles size={16} className="text-purple-400" />
                    Thinking Process ({thoughts.length})
                  </button>
                  
                  <AnimatePresence>
                    {expandedSections.thoughts && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {thoughts.slice(-10).map((thought, i) => (
                          <motion.div
                            key={thought.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-3 p-3 bg-gemini-surface/50 rounded-lg border border-gemini-border"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              {thought.agent && (
                                <span className="text-xs text-purple-400 font-medium mr-2">{thought.agent}</span>
                              )}
                              <span className="text-sm text-gray-300">{thought.thought}</span>
                            </div>
                          </motion.div>
                        ))}
                        {isResearching && (
                          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                            <Loader2 size={14} className="animate-spin" />
                            Processing...
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Sources Found - with loading animation during search */}
              {(sources.length > 0 || isResearching) && (
                <div className="mb-6">
                  <button
                    onClick={() => toggleSection('sources')}
                    className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-400 hover:text-gray-300"
                  >
                    {expandedSections.sources ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Globe size={16} className="text-blue-400" />
                    Sources Found ({sources.length})
                    {isResearching && <Loader2 size={14} className="animate-spin text-blue-400 ml-2" />}
                  </button>
                  
                  <AnimatePresence>
                    {expandedSections.sources && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {sources.slice(0, 15).map((source, index) => (
                          <motion.a
                            key={source.id || index}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start gap-3 p-3 bg-gemini-surface rounded-lg border border-gemini-border hover:border-blue-500/50 hover:bg-gemini-border/50 transition-all group"
                          >
                            <div className={`p-2 rounded-lg flex-shrink-0 ${sourceColors[source.sourceEngine] || 'bg-gray-500/20'}`}>
                              <SourceIcon source={source.sourceEngine} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-500">{source.sourceEngine}</span>
                                {source.reliability === 'high' && (
                                  <span className="flex items-center gap-1 text-xs text-yellow-400">
                                    <Star size={10} />
                                    Trusted
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-200 group-hover:text-white line-clamp-1 font-medium">
                                {source.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate mt-1 flex items-center gap-1">
                                <Link2 size={10} />
                                {source.url}
                              </p>
                              {source.snippet && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                  {source.snippet}
                                </p>
                              )}
                            </div>
                            <ExternalLink size={14} className="text-gray-500 group-hover:text-blue-400 flex-shrink-0 mt-1" />
                          </motion.a>
                        ))}
                        
                        {/* Loading placeholders during search */}
                        {isResearching && sources.length < 5 && (
                          <>
                            {[...Array(3)].map((_, i) => (
                              <div key={`loading-${i}`} className="flex items-start gap-3 p-3 bg-gemini-surface rounded-lg border border-gemini-border animate-pulse">
                                <div className="w-10 h-10 rounded-lg bg-gemini-border" />
                                <div className="flex-1 space-y-2">
                                  <div className="h-3 bg-gemini-border rounded w-20" />
                                  <div className="h-4 bg-gemini-border rounded w-3/4" />
                                  <div className="h-3 bg-gemini-border rounded w-full" />
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Final Results */}
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Stats Bar */}
                  <div className="flex flex-wrap items-center gap-4 p-4 bg-gemini-surface rounded-xl border border-gemini-border">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-green-400" />
                      <span className="text-sm text-gray-300">Research Complete</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 ml-auto">
                      <span>{results.stats?.totalSources || 0} sources searched</span>
                      <span>{results.stats?.sourcesAnalyzed || 0} analyzed</span>
                      <span>{((results.duration || 0) / 1000).toFixed(1)}s</span>
                    </div>
                  </div>

                  {/* Report */}
                  {results.report?.markdown && (
                    <div className="bg-gemini-surface rounded-xl border border-gemini-border overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gemini-border">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-blue-400" />
                          <span className="font-medium text-gray-200">Research Report</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={copyReport}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm ${
                              copySuccess 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'hover:bg-gemini-border text-gray-400 hover:text-white'
                            }`}
                            title="Copy report"
                          >
                            {copySuccess ? <Check size={14} /> : <Copy size={14} />}
                            {copySuccess ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            onClick={regenerateResearch}
                            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gemini-border rounded-lg transition-colors text-gray-400 hover:text-white text-sm"
                            title="Regenerate research"
                          >
                            <RefreshCw size={14} />
                            Regenerate
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-6 prose prose-invert prose-sm max-w-none">
                        <MarkdownRenderer content={results.report.markdown} />
                      </div>
                    </div>
                  )}

                  {/* Follow-up Questions */}
                  {results.report?.followUpQuestions?.length > 0 && (
                    <div className="p-4 bg-gemini-surface rounded-xl border border-gemini-border">
                      <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-400" />
                        Follow-up Questions
                      </h3>
                      <div className="space-y-2">
                        {results.report.followUpQuestions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => setQuery(q)}
                            className="w-full text-left px-3 py-2 bg-gemini-bg hover:bg-gemini-border rounded-lg text-sm text-gray-300 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              <div ref={resultsEndRef} className="h-32" />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gemini-border bg-gemini-surface/80 backdrop-blur-sm p-4">
            <div className="max-w-4xl mx-auto">
              {/* Depth Selector - Above Input */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-xs text-gray-500">Research Depth:</span>
                <div className="flex items-center gap-1 p-1 bg-gemini-bg rounded-full border border-gemini-border">
                  {depthOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setDepth(option.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        depth === option.id 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-gemini-border'
                      }`}
                    >
                      <option.icon size={12} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Field */}
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What would you like to research?"
                  disabled={isResearching}
                  className="w-full px-5 pr-28 py-4 bg-gemini-bg border border-gemini-border rounded-2xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 text-base"
                />

                {/* Send/Stop Button */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {isResearching ? (
                    <button
                      onClick={stopResearch}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
                    >
                      <X size={16} />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={startResearch}
                      disabled={!query.trim()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl transition-all font-medium"
                    >
                      <Send size={16} />
                      Research
                    </button>
                  )}
                </div>
              </div>

              <p className="text-center text-xs text-gray-500 mt-3">
                Press Enter to search • Aggregates from 6 trusted sources
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================
// MARKDOWN RENDERER
// ============================================
const MarkdownRenderer = ({ content }) => {
  if (!content) return null;
  
  // Convert markdown to HTML (basic implementation)
  const html = content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-white mt-8 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-8 mb-4">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-semibold text-white"><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Lists
    .replace(/^\s*[-*]\s+(.*)$/gim, '<li class="ml-4 mb-1 text-gray-300">$1</li>')
    .replace(/^\s*\d+\.\s+(.*)$/gim, '<li class="ml-4 mb-1 text-gray-300 list-decimal">$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm text-gray-300">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1.5 py-0.5 rounded text-sm text-gray-300">$1</code>')
    // Blockquotes
    .replace(/^>\s+(.*)$/gim, '<blockquote class="border-l-4 border-blue-500 pl-4 my-4 text-gray-400 italic">$1</blockquote>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="mb-4 text-gray-300 leading-relaxed">')
    .replace(/\n/g, '<br/>');

  return (
    <div 
      className="text-gray-300 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: `<p class="mb-4 text-gray-300 leading-relaxed">${html}</p>` }} 
    />
  );
};

export default App;
