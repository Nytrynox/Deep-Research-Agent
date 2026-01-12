import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required. Get one at https://aistudio.google.com/');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.apiKey = apiKey;
    
    // Gemini 3 Models (Latest - December 2025)
    this.models = {
      pro: 'gemini-3-pro-preview',      // State-of-the-art reasoning & multimodal
      flash: 'gemini-3-flash-preview'   // Fast frontier-class performance
    };
  }

  /**
   * Generate content with Gemini 3
   */
  async generate(prompt, options = {}) {
    const model = this.genAI.getGenerativeModel({
      model: options.model || this.models.flash,
      generationConfig: {
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxTokens || 8192,
      }
    });

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      return {
        text: response.text(),
        usage: response.usageMetadata || null
      };
    } catch (error) {
      console.error('Gemini API Error:', error.message);
      throw error;
    }
  }

  /**
   * Generate JSON response
   */
  async generateJSON(prompt, options = {}) {
    const fullPrompt = `${prompt}\n\nRespond ONLY with valid JSON, no markdown or explanation.`;
    
    const result = await this.generate(fullPrompt, {
      ...options,
      temperature: 0.3  // Lower temperature for structured output
    });

    try {
      // Clean the response - remove markdown code blocks if present
      let jsonText = result.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      
      return JSON.parse(jsonText.trim());
    } catch (e) {
      console.error('JSON Parse Error:', e.message);
      console.error('Raw response:', result.text.slice(0, 500));
      throw new Error('Failed to parse JSON response from Gemini');
    }
  }

  /**
   * Analyze and extract information from content
   */
  async analyze(content, instruction) {
    const prompt = `${instruction}

Content to analyze:
"""
${content}
"""

Provide a thorough analysis.`;

    return this.generate(prompt, { temperature: 0.5 });
  }

  /**
   * Multi-turn chat
   */
  async chat(history, message) {
    const model = this.genAI.getGenerativeModel({
      model: this.models.flash
    });

    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }))
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  }
}
