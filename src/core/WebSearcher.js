import axios from 'axios';
import * as cheerio from 'cheerio';

export class WebSearcher {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.timeout = 15000;
  }

  /**
   * Search using DuckDuckGo HTML (no API key required)
   */
  async search(query, maxResults = 10) {
    try {
      const response = await axios.get('https://html.duckduckgo.com/html/', {
        params: { q: query },
        headers: { 
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: this.timeout
      });

      const $ = cheerio.load(response.data);
      const results = [];

      $('.result').each((i, element) => {
        if (results.length >= maxResults) return false;

        const titleEl = $(element).find('.result__title a');
        const snippetEl = $(element).find('.result__snippet');
        
        const title = titleEl.text().trim();
        let url = titleEl.attr('href') || '';

        // Extract actual URL from DuckDuckGo redirect
        if (url.includes('uddg=')) {
          const match = url.match(/uddg=([^&]+)/);
          if (match) {
            url = decodeURIComponent(match[1]);
          }
        }

        const snippet = snippetEl.text().trim();

        if (title && url && url.startsWith('http')) {
          results.push({
            title,
            url,
            snippet,
            domain: this.extractDomain(url)
          });
        }
      });

      return results;
    } catch (error) {
      console.error('Search error:', error.message);
      return [];
    }
  }

  /**
   * Fetch and extract main content from a webpage
   */
  async fetchContent(url) {
    try {
      const response = await axios.get(url, {
        headers: { 
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: this.timeout,
        maxContentLength: 5000000,
        validateStatus: status => status < 400
      });

      const $ = cheerio.load(response.data);

      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .ad, .ads, .advertisement, .sidebar, .menu, .navigation, .comment, .comments, iframe, noscript').remove();

      // Try to find main content
      let content = '';
      const selectors = [
        'article',
        'main',
        '[role="main"]',
        '.post-content',
        '.article-content',
        '.entry-content',
        '.content',
        '#content',
        '.story-body',
        '.article-body'
      ];

      for (const selector of selectors) {
        const el = $(selector);
        if (el.length && el.text().trim().length > 200) {
          content = el.text().trim();
          break;
        }
      }

      // Fallback to body
      if (!content || content.length < 200) {
        content = $('body').text().trim();
      }

      // Clean up whitespace
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

      // Extract metadata
      const title = $('title').text().trim() || $('h1').first().text().trim();
      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || '';
      const publishDate = $('meta[property="article:published_time"]').attr('content') ||
                         $('time').attr('datetime') || '';

      return {
        url,
        title,
        description,
        content: content.slice(0, 15000), // Limit content length
        publishDate,
        wordCount: content.split(/\s+/).length,
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        url,
        error: error.message,
        content: '',
        fetchedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  /**
   * Check if a URL is likely a reliable source
   */
  assessSourceReliability(url) {
    const domain = this.extractDomain(url);
    
    const highlyReliable = [
      'nature.com', 'science.org', 'sciencedirect.com', 'springer.com',
      'ieee.org', 'acm.org', 'nih.gov', 'gov', 'edu',
      'bbc.com', 'reuters.com', 'apnews.com', 'npr.org',
      'nytimes.com', 'washingtonpost.com', 'theguardian.com',
      'who.int', 'cdc.gov', 'europa.eu'
    ];

    const reliable = [
      'wikipedia.org', 'britannica.com', 'nationalgeographic.com',
      'forbes.com', 'bloomberg.com', 'economist.com',
      'medium.com', 'substack.com', 'arxiv.org'
    ];

    const domainParts = domain.split('.');
    const tld = domainParts[domainParts.length - 1];

    if (tld === 'gov' || tld === 'edu') return 'high';
    if (highlyReliable.some(d => domain.includes(d))) return 'high';
    if (reliable.some(d => domain.includes(d))) return 'medium';
    return 'unknown';
  }
}
