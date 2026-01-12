import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { DeepResearchAgent } from './agents/DeepResearchAgent.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')));
}

// Store active sessions
const sessions = new Map();

// Check API key
const checkApiKey = () => {
  if (!process.env.GEMINI_API_KEY) {
    console.error('\n⚠️  GEMINI_API_KEY not set in .env file');
    console.error('   Get your API key at: https://aistudio.google.com/\n');
    return false;
  }
  return true;
};

// WebSocket connection handler
wss.on('connection', (ws) => {
  const sessionId = uuidv4();
  console.log(`🔗 Client connected: ${sessionId}`);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      // Handle both uppercase and lowercase event types
      const eventType = data.type?.toLowerCase();

      switch (eventType) {
        case 'check_api': {
          ws.send(JSON.stringify({
            type: 'api_status',
            configured: !!process.env.GEMINI_API_KEY
          }));
          break;
        }

        case 'research':
        case 'start_research': {
          if (!checkApiKey()) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'API key not configured. Please add GEMINI_API_KEY to .env file.'
            }));
            return;
          }

          const { query, depth } = data;
          
          if (!query || query.trim().length < 3) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Please enter a valid research question.'
            }));
            return;
          }

          // Create new research agent
          const agent = new DeepResearchAgent(process.env.GEMINI_API_KEY);
          sessions.set(sessionId, agent);

          // Set up event listeners with lowercase types
          agent.on('status', (status) => {
            ws.send(JSON.stringify({ type: 'status', ...status }));
          });

          agent.on('thought', (thought) => {
            ws.send(JSON.stringify({ type: 'thought', ...thought }));
          });

          agent.on('plan', (plan) => {
            ws.send(JSON.stringify({ type: 'plan', plan }));
          });

          agent.on('source', (source) => {
            ws.send(JSON.stringify({ type: 'source', source }));
          });

          agent.on('finding', (finding) => {
            ws.send(JSON.stringify({ type: 'finding', finding }));
          });

          agent.on('complete', (data) => {
            ws.send(JSON.stringify({ type: 'complete', results: data.results }));
          });

          agent.on('error', (error) => {
            ws.send(JSON.stringify({ type: 'error', error: error.message || error }));
          });

          // Start research
          ws.send(JSON.stringify({ 
            type: 'started', 
            sessionId,
            query 
          }));

          try {
            await agent.research(query, { depth: depth || 'standard' });
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              error: error.message
            }));
          }

          break;
        }

        case 'stop':
        case 'stop_research': {
          const agent = sessions.get(sessionId);
          if (agent) {
            agent.stop();
          }
          ws.send(JSON.stringify({ type: 'stopped' }));
          break;
        }
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'An error occurred processing your request.'
      }));
    }
  });

  ws.on('close', () => {
    console.log(`🔌 Client disconnected: ${sessionId}`);
    const agent = sessions.get(sessionId);
    if (agent) {
      agent.stop();
      sessions.delete(sessionId);
    }
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({ 
    type: 'connected', 
    sessionId,
    apiConfigured: !!process.env.GEMINI_API_KEY
  }));
});

// REST endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🔬  DEEP RESEARCH AGENT v2.0                                    ║
║       Multi-Source Research powered by Gemini 3 + Tavily          ║
║                                                                   ║
║   Server: http://localhost:${PORT}                                  ║
║   WebSocket: ws://localhost:${PORT}                                 ║
║                                                                   ║
║   Sources: Tavily, DuckDuckGo, Wikipedia, ArXiv,                  ║
║            HackerNews, Reddit, GitHub                             ║
║                                                                   ║
║   Gemini: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ Not configured'}                                ║
║   Tavily: ${process.env.TAVILY_API_KEY ? '✓ Configured' : '✓ Using default key'}                              ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
