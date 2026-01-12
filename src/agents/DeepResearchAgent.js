import { EventEmitter } from 'events';
import { GeminiClient } from '../core/GeminiClient.js';
import { MultiSourceSearcher } from '../core/MultiSourceSearcher.js';

/**
 * Advanced Deep Research Agent
 * Multi-source, multi-agent research system powered by Gemini 3
 */
export class DeepResearchAgent extends EventEmitter {
  constructor(apiKey) {
    super();
    this.gemini = new GeminiClient(apiKey);
    this.searcher = new MultiSourceSearcher();
    this.isRunning = false;
    this.shouldStop = false;
  }

  /**
   * Main research entry point
   */
  async research(query, options = {}) {
    this.isRunning = true;
    this.shouldStop = false;
    const startTime = Date.now();

    try {
      this.emit('status', { phase: 'initializing', message: 'Starting deep research...' });

      // Phase 1: Understand and plan
      this.emit('status', { phase: 'planning', message: 'Understanding your query...' });
      const plan = await this.createResearchPlan(query, options);
      this.emit('plan', { plan });

      if (this.shouldStop) throw new Error('Research stopped by user');

      // Phase 2: Multi-source search
      this.emit('status', { phase: 'searching', message: 'Searching multiple sources...' });
      const searchResults = await this.executeMultiSourceSearch(plan.searchQueries);

      if (this.shouldStop) throw new Error('Research stopped by user');

      // Phase 3: Fetch and analyze content
      this.emit('status', { phase: 'analyzing', message: 'Analyzing sources in depth...' });
      const analyzedSources = await this.analyzeSourcesDeep(searchResults, query);

      if (this.shouldStop) throw new Error('Research stopped by user');

      // Phase 4: Cross-reference and synthesize
      this.emit('status', { phase: 'synthesizing', message: 'Cross-referencing findings...' });
      const synthesis = await this.synthesizeFindings(analyzedSources, query);

      if (this.shouldStop) throw new Error('Research stopped by user');

      // Phase 5: Generate comprehensive report
      this.emit('status', { phase: 'reporting', message: 'Writing comprehensive report...' });
      const report = await this.generateReport(query, synthesis, analyzedSources);

      // Compile final results
      const results = {
        query,
        report,
        synthesis,
        sources: analyzedSources.map(s => ({
          title: s.title,
          url: s.url,
          snippet: s.snippet,
          source: s.source,
          sourceEngine: s.sourceEngine,
          reliability: s.reliability,
          icon: s.icon
        })),
        findings: analyzedSources.filter(s => s.analysis),
        stats: {
          totalSources: searchResults.length,
          sourcesAnalyzed: analyzedSources.length,
          highReliabilitySources: analyzedSources.filter(s => s.reliability === 'high').length,
          sourceTypes: this.countSourceTypes(analyzedSources)
        },
        duration: Date.now() - startTime
      };

      this.emit('complete', { results });
      return results;

    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Create a strategic research plan using Gemini 3
   */
  async createResearchPlan(query, options) {
    this.emit('thought', { agent: 'Planner', thought: 'Analyzing query to create optimal research strategy...' });

    const depth = options.depth || 'standard';
    const queryCount = { quick: 4, standard: 6, deep: 10 }[depth];

    const prompt = `You are a research planning expert. Create a research plan for this query:

"${query}"

Generate ${queryCount} diverse search queries that will help gather comprehensive information.
Consider different angles: definitions, recent news, academic research, expert opinions, practical applications, controversies.

Respond in JSON format:
{
  "mainTopic": "core topic identified",
  "researchGoal": "what we aim to discover",
  "searchQueries": ["query1", "query2", ...],
  "sourcePriorities": ["web", "academic", "news", "discussion"],
  "keyAspects": ["aspect1", "aspect2", "aspect3"]
}`;

    const result = await this.gemini.generateJSON(prompt);
    this.emit('thought', { agent: 'Planner', thought: `Created plan with ${result.searchQueries?.length || 0} research queries` });

    return result;
  }

  /**
   * Execute searches across multiple sources
   */
  async executeMultiSourceSearch(queries) {
    const allResults = [];
    const sourcesToUse = ['duckduckgo', 'wikipedia', 'arxiv', 'hackernews', 'reddit', 'github'];

    for (let i = 0; i < queries.length; i++) {
      if (this.shouldStop) break;

      const query = queries[i];
      this.emit('thought', { agent: 'Searcher', thought: `Searching: "${query}"` });
      this.emit('status', { phase: 'searching', message: `Query ${i + 1}/${queries.length}: ${query}` });

      try {
        const results = await this.searcher.searchAll(query, { 
          sources: sourcesToUse,
          maxResults: 8 
        });

        for (const result of results) {
          result.reliability = this.searcher.assessReliability(result);
          result.searchQuery = query;
          allResults.push(result);
          this.emit('source', { source: result });
        }

        this.emit('thought', { agent: 'Searcher', thought: `Found ${results.length} results from multiple sources` });
      } catch (error) {
        this.emit('thought', { agent: 'Searcher', thought: `Search error: ${error.message}` });
      }

      // Small delay between searches
      await this.delay(300);
    }

    // Deduplicate and prioritize
    return this.prioritizeSources(allResults);
  }

  /**
   * Prioritize and deduplicate sources
   */
  prioritizeSources(sources) {
    // Remove duplicates
    const seen = new Set();
    const unique = sources.filter(s => {
      const key = s.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by reliability and diversity
    return unique.sort((a, b) => {
      const reliabilityScore = { high: 3, medium: 2, standard: 1 };
      const sourceScore = { academic: 3, encyclopedia: 2, web: 1, 'tech-news': 2, discussion: 1, code: 2 };
      
      const scoreA = (reliabilityScore[a.reliability] || 1) + (sourceScore[a.source] || 1);
      const scoreB = (reliabilityScore[b.reliability] || 1) + (sourceScore[b.source] || 1);
      
      return scoreB - scoreA;
    });
  }

  /**
   * Deep analysis of sources
   */
  async analyzeSourcesDeep(sources, query) {
    const analyzed = [];
    const maxToAnalyze = 12;
    const prioritized = sources.slice(0, maxToAnalyze);

    for (let i = 0; i < prioritized.length; i++) {
      if (this.shouldStop) break;

      const source = prioritized[i];
      this.emit('status', { phase: 'analyzing', message: `Analyzing ${source.sourceEngine}: ${source.title.slice(0, 40)}...` });

      try {
        // Fetch full content
        const content = await this.searcher.fetchContent(source.url);

        if (content.content && content.content.length > 100) {
          // AI analysis
          const analysis = await this.analyzeContent(content.content, query, source);
          
          analyzed.push({
            ...source,
            content: content.content.slice(0, 4000),
            analysis
          });

          this.emit('finding', { 
            source: source.title,
            sourceEngine: source.sourceEngine,
            analysis 
          });
          
          this.emit('thought', { 
            agent: 'Analyzer', 
            thought: `Extracted ${analysis.keyPoints?.length || 0} key points from ${source.sourceEngine}` 
          });
        } else {
          analyzed.push({ ...source, analysis: null });
        }
      } catch (error) {
        analyzed.push({ ...source, analysis: null });
      }

      await this.delay(200);
    }

    return analyzed;
  }

  /**
   * Analyze content with Gemini 3
   */
  async analyzeContent(content, query, source) {
    const prompt = `Analyze this content for research on "${query}".

Source: ${source.sourceEngine} (${source.source})
Content:
${content.slice(0, 6000)}

Extract:
1. Key points relevant to the research query
2. Important facts, statistics, or data
3. Expert opinions or conclusions
4. Credibility assessment

Respond in JSON:
{
  "keyPoints": ["point1", "point2", ...],
  "facts": ["fact1", "fact2", ...],
  "opinions": ["opinion1", ...],
  "credibility": "high/medium/low",
  "relevance": "high/medium/low",
  "summary": "brief summary"
}`;

    return await this.gemini.generateJSON(prompt);
  }

  /**
   * Synthesize all findings
   */
  async synthesizeFindings(sources, query) {
    this.emit('thought', { agent: 'Synthesizer', thought: 'Cross-referencing all findings...' });

    const analyzedSources = sources.filter(s => s.analysis);
    
    if (analyzedSources.length === 0) {
      return {
        consensus: [],
        controversies: [],
        gaps: ['Limited analyzed sources available'],
        confidence: 'low'
      };
    }

    const findings = analyzedSources.map(s => ({
      source: s.sourceEngine,
      type: s.source,
      keyPoints: s.analysis.keyPoints || [],
      facts: s.analysis.facts || [],
      relevance: s.analysis.relevance
    }));

    const prompt = `Synthesize these research findings on "${query}":

${JSON.stringify(findings, null, 2)}

Identify:
1. Points where multiple sources agree (consensus)
2. Contradictions or debates
3. Knowledge gaps
4. Overall confidence level

Respond in JSON:
{
  "consensus": ["agreed point 1", "agreed point 2", ...],
  "keyInsights": ["insight1", "insight2", ...],
  "controversies": ["controversy1", ...],
  "gaps": ["gap1", ...],
  "confidence": "high/medium/low",
  "summary": "synthesis summary"
}`;

    const synthesis = await this.gemini.generateJSON(prompt);
    this.emit('thought', { agent: 'Synthesizer', thought: `Found ${synthesis.consensus?.length || 0} consensus points` });

    return synthesis;
  }

  /**
   * Generate comprehensive research report
   */
  async generateReport(query, synthesis, sources) {
    this.emit('thought', { agent: 'Writer', thought: 'Composing comprehensive research report...' });

    const analyzedSources = sources.filter(s => s.analysis);
    const sourceTypes = this.countSourceTypes(sources);

    const prompt = `Write a comprehensive research report on: "${query}"

Based on ${sources.length} sources analyzed across:
${Object.entries(sourceTypes).map(([type, count]) => `- ${type}: ${count} sources`).join('\n')}

Key findings:
${JSON.stringify(synthesis, null, 2)}

Detailed findings from sources:
${analyzedSources.slice(0, 8).map(s => `
[${s.sourceEngine}] ${s.title}
Key points: ${(s.analysis.keyPoints || []).join('; ')}
`).join('\n')}

Write a professional research report with:
1. **Executive Summary** - Key findings in 2-3 sentences
2. **Introduction** - Context and scope
3. **Key Findings** - Main discoveries organized by theme
4. **Source Analysis** - What different source types revealed
5. **Consensus & Debates** - Where sources agree/disagree
6. **Conclusions** - Final assessment
7. **References** - List sources used

Use markdown formatting. Be comprehensive but clear. Include specific facts and data points.
Confidence Level: ${synthesis.confidence || 'medium'}`;

    const result = await this.gemini.generate(prompt, { maxTokens: 4000 });

    // Generate follow-up questions
    const followUpPrompt = `Based on research about "${query}", suggest 4 insightful follow-up questions that would deepen understanding. Return as JSON array: ["question1", "question2", ...]`;
    const followUps = await this.gemini.generateJSON(followUpPrompt);

    // Detect knowledge gaps for refinement loop
    this.emit('thought', { agent: 'Analyzer', thought: 'Identifying knowledge gaps for potential follow-up research...' });
    
    const gapsPrompt = `Based on the research about "${query}", identify 3-4 specific knowledge gaps or areas where information was insufficient or missing. These should be actionable research queries. Return as JSON array: ["gap1", "gap2", ...]`;
    let knowledgeGaps = [];
    try {
      const gapsResult = await this.gemini.generateJSON(gapsPrompt);
      knowledgeGaps = Array.isArray(gapsResult) ? gapsResult : [];
    } catch (e) {
      // Use synthesis gaps as fallback
      knowledgeGaps = synthesis.gaps || [];
    }

    return {
      markdown: result.text,
      followUpQuestions: Array.isArray(followUps) ? followUps : [],
      knowledgeGaps: knowledgeGaps.slice(0, 4),
      confidence: synthesis.confidence || 'medium',
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Count sources by type
   */
  countSourceTypes(sources) {
    const counts = {};
    sources.forEach(s => {
      const type = s.sourceEngine || s.source || 'other';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }

  /**
   * Stop research
   */
  stop() {
    this.shouldStop = true;
  }

  /**
   * Utility delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
