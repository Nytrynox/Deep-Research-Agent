import { EventEmitter } from 'events';
import { GeminiClient } from '../core/GeminiClient.js';
import { WebSearcher } from '../core/WebSearcher.js';

export class ResearchAgent extends EventEmitter {
  constructor(apiKey) {
    super();
    this.gemini = new GeminiClient(apiKey);
    this.searcher = new WebSearcher();
    this.aborted = false;
    
    // Research state
    this.state = {
      query: '',
      phase: 'idle',
      sources: [],
      findings: [],
      report: null,
      startTime: null,
      endTime: null
    };
  }

  /**
   * Stop the research process
   */
  abort() {
    this.aborted = true;
    this.emit('status', { phase: 'aborted', message: 'Research aborted by user' });
  }

  /**
   * Main research entry point
   */
  async research(query, options = {}) {
    this.aborted = false;
    this.state = {
      query,
      phase: 'starting',
      sources: [],
      findings: [],
      report: null,
      startTime: Date.now(),
      endTime: null
    };

    const depth = options.depth || 'standard'; // quick, standard, deep

    try {
      // Phase 1: Understand and plan
      this.emit('status', { phase: 'planning', message: 'Analyzing research question...' });
      const plan = await this.createResearchPlan(query, depth);
      
      if (this.aborted) return this.getResults();
      this.emit('plan', plan);

      // Phase 2: Execute searches
      this.emit('status', { phase: 'searching', message: 'Searching for sources...' });
      await this.executeSearches(plan.searchQueries);
      
      if (this.aborted) return this.getResults();

      // Phase 3: Fetch and analyze sources
      this.emit('status', { phase: 'analyzing', message: 'Analyzing sources...' });
      await this.analyzeSources(plan.focusAreas);
      
      if (this.aborted) return this.getResults();

      // Phase 4: Synthesize findings
      this.emit('status', { phase: 'synthesizing', message: 'Synthesizing research findings...' });
      const synthesis = await this.synthesizeFindings();
      
      if (this.aborted) return this.getResults();

      // Phase 5: Generate report
      this.emit('status', { phase: 'reporting', message: 'Generating research report...' });
      const report = await this.generateReport(synthesis);
      
      this.state.report = report;
      this.state.endTime = Date.now();
      this.state.phase = 'complete';

      this.emit('status', { phase: 'complete', message: 'Research complete!' });
      this.emit('complete', this.getResults());

      return this.getResults();

    } catch (error) {
      this.state.phase = 'error';
      this.emit('error', { message: error.message });
      throw error;
    }
  }

  /**
   * Create a research plan using Gemini
   */
  async createResearchPlan(query, depth) {
    const searchCount = depth === 'quick' ? 3 : depth === 'deep' ? 8 : 5;
    
    const prompt = `You are a research planning expert. Create a research plan for this question:

"${query}"

Generate ${searchCount} specific search queries that will help find comprehensive information about this topic.
Each query should target different aspects or angles of the topic.

Also identify 3-5 key focus areas that the research should cover.

Respond in JSON format:
{
  "mainTopic": "the core topic",
  "searchQueries": ["query1", "query2", ...],
  "focusAreas": ["area1", "area2", ...],
  "expectedInsights": ["what we hope to learn"]
}`;

    const plan = await this.gemini.generateJSON(prompt);
    
    this.emit('thought', { 
      agent: 'Planner',
      thought: `Breaking down "${query}" into ${plan.searchQueries.length} search queries covering: ${plan.focusAreas.join(', ')}`
    });

    return plan;
  }

  /**
   * Execute search queries and collect sources
   */
  async executeSearches(queries) {
    for (const query of queries) {
      if (this.aborted) break;

      this.emit('thought', { 
        agent: 'Searcher',
        thought: `Searching: "${query}"`
      });

      const results = await this.searcher.search(query, 5);
      
      for (const result of results) {
        // Avoid duplicates
        if (!this.state.sources.find(s => s.url === result.url)) {
          result.reliability = this.searcher.assessSourceReliability(result.url);
          this.state.sources.push(result);
          this.emit('source', result);
        }
      }

      // Small delay to avoid rate limiting
      await this.delay(500);
    }

    this.emit('thought', { 
      agent: 'Searcher',
      thought: `Found ${this.state.sources.length} unique sources`
    });
  }

  /**
   * Fetch and analyze source content
   */
  async analyzeSources(focusAreas) {
    // Sort by reliability and take top sources
    const sourcesToAnalyze = this.state.sources
      .sort((a, b) => {
        const order = { high: 0, medium: 1, unknown: 2 };
        return (order[a.reliability] || 2) - (order[b.reliability] || 2);
      })
      .slice(0, 8);

    for (const source of sourcesToAnalyze) {
      if (this.aborted) break;

      this.emit('thought', { 
        agent: 'Analyzer',
        thought: `Reading: ${source.title}`
      });

      // Fetch full content
      const content = await this.searcher.fetchContent(source.url);
      
      if (content.error || !content.content || content.content.length < 100) {
        continue;
      }

      // Analyze with Gemini
      const analysis = await this.analyzeContent(content, focusAreas);
      
      if (analysis && analysis.keyPoints && analysis.keyPoints.length > 0) {
        this.state.findings.push({
          source: {
            title: source.title,
            url: source.url,
            domain: source.domain,
            reliability: source.reliability
          },
          analysis
        });

        this.emit('finding', {
          source: source.title,
          keyPoints: analysis.keyPoints
        });
      }

      await this.delay(300);
    }

    this.emit('thought', { 
      agent: 'Analyzer',
      thought: `Extracted insights from ${this.state.findings.length} sources`
    });
  }

  /**
   * Analyze content from a source
   */
  async analyzeContent(content, focusAreas) {
    const prompt = `Analyze this content and extract key information relevant to these focus areas: ${focusAreas.join(', ')}

Source: ${content.title}
URL: ${content.url}

Content:
"""
${content.content.slice(0, 8000)}
"""

Extract the most important and factual information. Respond in JSON:
{
  "keyPoints": ["specific factual points found"],
  "relevantQuotes": ["direct quotes if any"],
  "dataPoints": ["any statistics, numbers, dates"],
  "perspective": "the viewpoint or angle of this source",
  "credibilityNotes": "any concerns about accuracy"
}`;

    try {
      return await this.gemini.generateJSON(prompt);
    } catch (error) {
      console.error('Analysis error:', error.message);
      return null;
    }
  }

  /**
   * Synthesize all findings
   */
  async synthesizeFindings() {
    if (this.state.findings.length === 0) {
      return {
        summary: 'No substantial findings were extracted from the sources.',
        themes: [],
        consensus: [],
        contradictions: []
      };
    }

    const findingsSummary = this.state.findings.map((f, i) => `
Source ${i + 1}: ${f.source.title} (${f.source.reliability} reliability)
Key Points:
${f.analysis.keyPoints.map(p => `- ${p}`).join('\n')}
${f.analysis.dataPoints?.length ? `Data: ${f.analysis.dataPoints.join(', ')}` : ''}
`).join('\n---\n');

    const prompt = `Synthesize these research findings into a coherent understanding:

Research Question: "${this.state.query}"

Findings from ${this.state.findings.length} sources:
${findingsSummary}

Analyze all findings and create a synthesis. Identify:
1. Common themes across sources
2. Points of consensus (agreed upon facts)
3. Any contradictions or disagreements
4. Gaps in the research

Respond in JSON:
{
  "summary": "2-3 paragraph executive summary",
  "themes": [{"theme": "name", "description": "explanation", "sources": ["which sources support this"]}],
  "consensus": [{"point": "agreed fact", "confidence": "high/medium/low", "sources": ["supporting sources"]}],
  "contradictions": [{"topic": "what differs", "positions": ["different views"]}],
  "gaps": ["what wasn't covered"],
  "keyInsights": ["most important takeaways"]
}`;

    this.emit('thought', { 
      agent: 'Synthesizer',
      thought: 'Cross-referencing findings across all sources...'
    });

    return await this.gemini.generateJSON(prompt);
  }

  /**
   * Generate the final research report
   */
  async generateReport(synthesis) {
    const prompt = `Write a comprehensive research report based on this synthesis.

Research Question: "${this.state.query}"

Synthesis:
${JSON.stringify(synthesis, null, 2)}

Sources Used: ${this.state.findings.length}
${this.state.findings.map((f, i) => `[${i + 1}] ${f.source.title} - ${f.source.url}`).join('\n')}

Write a well-structured report in Markdown format with:
1. **Executive Summary** - Brief overview of findings
2. **Key Findings** - Main discoveries organized by theme
3. **Analysis** - Deeper examination of the evidence
4. **Conclusions** - What we can confidently conclude
5. **Limitations** - What we don't know or couldn't verify
6. **References** - List of sources with numbers

Use citations like [1], [2] when referencing sources.
Make it informative, balanced, and evidence-based.
Length: 800-1200 words.`;

    this.emit('thought', { 
      agent: 'Writer',
      thought: 'Composing final research report...'
    });

    const result = await this.gemini.generate(prompt);
    
    return {
      markdown: result.text,
      generatedAt: new Date().toISOString(),
      sourceCount: this.state.findings.length,
      query: this.state.query
    };
  }

  /**
   * Generate follow-up questions
   */
  async generateFollowUpQuestions() {
    if (!this.state.report) return [];

    const prompt = `Based on this research about "${this.state.query}", suggest 5 follow-up questions that would deepen understanding or explore related areas.

Research summary:
${this.state.report.markdown.slice(0, 2000)}

Return as JSON array: ["question1", "question2", ...]`;

    try {
      return await this.gemini.generateJSON(prompt);
    } catch {
      return [];
    }
  }

  /**
   * Get current results
   */
  getResults() {
    return {
      query: this.state.query,
      phase: this.state.phase,
      sources: this.state.sources,
      findings: this.state.findings,
      report: this.state.report,
      duration: this.state.endTime 
        ? this.state.endTime - this.state.startTime 
        : Date.now() - this.state.startTime,
      stats: {
        sourcesFound: this.state.sources.length,
        sourcesAnalyzed: this.state.findings.length,
        highReliabilitySources: this.state.sources.filter(s => s.reliability === 'high').length
      }
    };
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
