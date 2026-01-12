import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Multi-Source Web Searcher
 * Aggregates results from multiple APIs and sources including Tavily
 */
export class MultiSourceSearcher {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.timeout = 10000;
    this.tavilyApiKey = process.env.TAVILY_API_KEY || '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';
  }

  /**
   * Search across all available sources
   */
  async searchAll(query, options = {}) {
    const sources = options.sources || ['tavily', 'duckduckgo', 'wikipedia', 'arxiv', 'hackernews', 'reddit', 'github'];
    const maxResults = options.maxResults || 15;

    const searchPromises = sources.map(source => this.searchSource(source, query, maxResults));
    const results = await Promise.allSettled(searchPromises);

    const allResults = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        allResults.push(...result.value);
      }
    });

    // Deduplicate and sort by relevance
    return this.deduplicateResults(allResults).slice(0, maxResults * 2);
  }

  /**
   * Search a specific source
   */
  async searchSource(source, query, maxResults) {
    try {
      switch (source) {
        case 'tavily':
          return await this.searchTavily(query, maxResults);
        case 'duckduckgo':
          return await this.searchDuckDuckGo(query, maxResults);
        case 'wikipedia':
          return await this.searchWikipedia(query, maxResults);
        case 'arxiv':
          return await this.searchArxiv(query, maxResults);
        case 'hackernews':
          return await this.searchHackerNews(query, maxResults);
        case 'reddit':
          return await this.searchReddit(query, maxResults);
        case 'github':
          return await this.searchGitHub(query, maxResults);
        default:
          return [];
      }
    } catch (error) {
      console.error(`Error searching ${source}:`, error.message);
      return [];
    }
  }

  /**
   * Tavily AI Search API (Premium Search)
   */
  async searchTavily(query, maxResults = 5) {
    try {
      const response = await axios.post('https://api.tavily.com/search', {
        api_key: this.tavilyApiKey,
        query: query,
        search_depth: 'advanced',
        include_answer: false,
        include_raw_content: false,
        max_results: maxResults,
        include_domains: [],
        exclude_domains: []
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: this.timeout
      });

      return (response.data.results || []).map(item => ({
        title: item.title,
        url: item.url,
        snippet: item.content || item.snippet || '',
        source: 'ai-search',
        sourceEngine: 'Tavily',
        icon: '🔮',
        score: item.score,
        publishedDate: item.published_date
      }));
    } catch (error) {
      console.error('Tavily search error:', error.message);
      return [];
    }
  }

  /**
   * DuckDuckGo Search (Primary Web Search)
   */
  async searchDuckDuckGo(query, maxResults = 10) {
    try {
      const response = await axios.get('https://html.duckduckgo.com/html/', {
        params: { q: query },
        headers: { 'User-Agent': this.userAgent },
        timeout: this.timeout
      });

      const $ = cheerio.load(response.data);
      const results = [];

      $('.result').each((i, elem) => {
        if (i >= maxResults) return false;

        const titleElem = $(elem).find('.result__title a');
        const snippetElem = $(elem).find('.result__snippet');
        const url = titleElem.attr('href');

        if (url && !url.includes('duckduckgo.com')) {
          results.push({
            title: titleElem.text().trim(),
            url: this.cleanDuckDuckGoUrl(url),
            snippet: snippetElem.text().trim(),
            source: 'web',
            sourceEngine: 'DuckDuckGo',
            icon: '🌐'
          });
        }
      });

      return results;
    } catch (error) {
      console.error('DuckDuckGo search error:', error.message);
      return [];
    }
  }

  /**
   * Wikipedia API Search (Free, No Key Required)
   */
  async searchWikipedia(query, maxResults = 5) {
    try {
      const response = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          list: 'search',
          srsearch: query,
          format: 'json',
          srlimit: maxResults,
          origin: '*'
        },
        timeout: this.timeout
      });

      return response.data.query.search.map(item => ({
        title: item.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
        snippet: this.stripHtml(item.snippet),
        source: 'encyclopedia',
        sourceEngine: 'Wikipedia',
        icon: '📚',
        wordCount: item.wordcount
      }));
    } catch (error) {
      console.error('Wikipedia search error:', error.message);
      return [];
    }
  }

  /**
   * ArXiv API Search (Academic Papers - Free)
   */
  async searchArxiv(query, maxResults = 5) {
    try {
      const response = await axios.get('http://export.arxiv.org/api/query', {
        params: {
          search_query: `all:${query}`,
          start: 0,
          max_results: maxResults,
          sortBy: 'relevance',
          sortOrder: 'descending'
        },
        timeout: this.timeout
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const results = [];

      $('entry').each((i, elem) => {
        const title = $(elem).find('title').text().trim().replace(/\s+/g, ' ');
        const summary = $(elem).find('summary').text().trim().replace(/\s+/g, ' ');
        const id = $(elem).find('id').text().trim();
        const published = $(elem).find('published').text().trim();
        const authors = [];
        $(elem).find('author name').each((j, author) => {
          authors.push($(author).text().trim());
        });

        results.push({
          title,
          url: id,
          snippet: summary.slice(0, 300) + (summary.length > 300 ? '...' : ''),
          source: 'academic',
          sourceEngine: 'ArXiv',
          icon: '🎓',
          authors: authors.slice(0, 3),
          published: published.split('T')[0]
        });
      });

      return results;
    } catch (error) {
      console.error('ArXiv search error:', error.message);
      return [];
    }
  }

  /**
   * Hacker News Search (Tech News - Free via Algolia)
   */
  async searchHackerNews(query, maxResults = 5) {
    try {
      const response = await axios.get('https://hn.algolia.com/api/v1/search', {
        params: {
          query: query,
          tags: 'story',
          hitsPerPage: maxResults
        },
        timeout: this.timeout
      });

      return response.data.hits.map(item => ({
        title: item.title,
        url: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`,
        snippet: item.story_text ? this.stripHtml(item.story_text).slice(0, 200) : `${item.points} points | ${item.num_comments} comments`,
        source: 'tech-news',
        sourceEngine: 'Hacker News',
        icon: '💻',
        points: item.points,
        comments: item.num_comments,
        date: item.created_at
      }));
    } catch (error) {
      console.error('Hacker News search error:', error.message);
      return [];
    }
  }

  /**
   * Reddit Search (Discussions - Free)
   */
  async searchReddit(query, maxResults = 5) {
    try {
      const response = await axios.get('https://www.reddit.com/search.json', {
        params: {
          q: query,
          limit: maxResults,
          sort: 'relevance',
          t: 'year'
        },
        headers: { 'User-Agent': this.userAgent },
        timeout: this.timeout
      });

      return response.data.data.children.map(item => ({
        title: item.data.title,
        url: `https://reddit.com${item.data.permalink}`,
        snippet: item.data.selftext ? item.data.selftext.slice(0, 200) : `r/${item.data.subreddit} • ${item.data.score} upvotes`,
        source: 'discussion',
        sourceEngine: 'Reddit',
        icon: '💬',
        subreddit: item.data.subreddit,
        score: item.data.score,
        comments: item.data.num_comments
      }));
    } catch (error) {
      console.error('Reddit search error:', error.message);
      return [];
    }
  }

  /**
   * GitHub Search (Code & Repos - Free with rate limits)
   */
  async searchGitHub(query, maxResults = 5) {
    try {
      const response = await axios.get('https://api.github.com/search/repositories', {
        params: {
          q: query,
          sort: 'stars',
          order: 'desc',
          per_page: maxResults
        },
        headers: { 
          'User-Agent': this.userAgent,
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: this.timeout
      });

      return response.data.items.map(item => ({
        title: item.full_name,
        url: item.html_url,
        snippet: item.description || `⭐ ${item.stargazers_count} stars | ${item.language || 'Unknown'}`,
        source: 'code',
        sourceEngine: 'GitHub',
        icon: '🔧',
        stars: item.stargazers_count,
        language: item.language,
        forks: item.forks_count
      }));
    } catch (error) {
      console.error('GitHub search error:', error.message);
      return [];
    }
  }

  /**
   * Fetch and extract content from a URL
   */
  async fetchContent(url, options = {}) {
    try {
      // Handle special URLs
      if (url.includes('arxiv.org/abs/')) {
        return await this.fetchArxivPaper(url);
      }
      if (url.includes('wikipedia.org')) {
        return await this.fetchWikipediaArticle(url);
      }

      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: options.timeout || 15000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);

      // Remove unwanted elements
      $('script, style, nav, footer, header, aside, .ad, .advertisement, .sidebar, .menu, .comments').remove();

      // Extract main content
      const mainSelectors = ['article', 'main', '.content', '.post-content', '.article-content', '.entry-content', '#content'];
      let content = '';

      for (const selector of mainSelectors) {
        const main = $(selector).first();
        if (main.length) {
          content = main.text().trim();
          break;
        }
      }

      if (!content) {
        content = $('body').text().trim();
      }

      // Clean and limit content
      content = content.replace(/\s+/g, ' ').trim();
      const maxLength = options.maxLength || 8000;
      if (content.length > maxLength) {
        content = content.slice(0, maxLength) + '...';
      }

      return {
        content,
        title: $('title').text().trim() || $('h1').first().text().trim(),
        url,
        wordCount: content.split(/\s+/).length
      };
    } catch (error) {
      return {
        content: '',
        title: 'Failed to fetch',
        url,
        error: error.message
      };
    }
  }

  /**
   * Fetch ArXiv paper content
   */
  async fetchArxivPaper(url) {
    try {
      const arxivId = url.match(/(\d+\.\d+)/)?.[1];
      if (!arxivId) throw new Error('Invalid ArXiv URL');

      const response = await axios.get(`http://export.arxiv.org/api/query?id_list=${arxivId}`, {
        timeout: this.timeout
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const entry = $('entry').first();

      const title = entry.find('title').text().trim();
      const summary = entry.find('summary').text().trim();
      const authors = [];
      entry.find('author name').each((i, elem) => {
        authors.push($(elem).text().trim());
      });

      return {
        content: `Title: ${title}\n\nAuthors: ${authors.join(', ')}\n\nAbstract:\n${summary}`,
        title,
        url,
        authors,
        wordCount: summary.split(/\s+/).length
      };
    } catch (error) {
      return { content: '', title: 'Failed to fetch', url, error: error.message };
    }
  }

  /**
   * Fetch Wikipedia article content
   */
  async fetchWikipediaArticle(url) {
    try {
      const title = url.split('/wiki/')[1];
      if (!title) throw new Error('Invalid Wikipedia URL');

      const response = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          titles: decodeURIComponent(title),
          prop: 'extracts',
          exintro: false,
          explaintext: true,
          format: 'json',
          origin: '*'
        },
        timeout: this.timeout
      });

      const pages = response.data.query.pages;
      const page = Object.values(pages)[0];

      return {
        content: page.extract || '',
        title: page.title,
        url,
        wordCount: (page.extract || '').split(/\s+/).length
      };
    } catch (error) {
      return { content: '', title: 'Failed to fetch', url, error: error.message };
    }
  }

  /**
   * Assess source reliability
   */
  assessReliability(source) {
    const highReliability = ['wikipedia.org', 'arxiv.org', 'nature.com', 'science.org', 'gov', 'edu', 'bbc.com', 'reuters.com', 'nytimes.com', 'github.com'];
    const mediumReliability = ['medium.com', 'reddit.com', 'news.ycombinator.com', 'stackoverflow.com', 'quora.com'];
    
    const domain = this.extractDomain(source.url);
    
    // Tavily results are pre-verified
    if (source.sourceEngine === 'Tavily' || source.sourceEngine === 'ArXiv' || source.sourceEngine === 'Wikipedia') {
      return 'high';
    }
    
    if (highReliability.some(d => domain.includes(d))) return 'high';
    if (mediumReliability.some(d => domain.includes(d))) return 'medium';
    return 'standard';
  }

  /**
   * Utility: Extract domain from URL
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  /**
   * Utility: Clean DuckDuckGo redirect URL
   */
  cleanDuckDuckGoUrl(url) {
    try {
      const decoded = decodeURIComponent(url);
      const match = decoded.match(/uddg=([^&]+)/);
      return match ? decodeURIComponent(match[1]) : url;
    } catch {
      return url;
    }
  }

  /**
   * Utility: Strip HTML tags
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
  }

  /**
   * Utility: Deduplicate results by URL
   */
  deduplicateResults(results) {
    const seen = new Set();
    return results.filter(result => {
      const domain = this.extractDomain(result.url);
      const key = domain + result.title.slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
