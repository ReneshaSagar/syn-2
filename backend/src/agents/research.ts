import { llmService } from '../services/llm';
import { IdeaAnalysis, SimulationConfig } from '../types';
import { getLensInstruction } from '../prompts/templates';

async function performWebSearch(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn('TAVILY_API_KEY is missing. Skipping live web search.');
    return 'No live data available.';
  }

  try {
    console.log(`[Tavily] Executing live web search: "${query}"...`);
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: 'advanced',
        include_answer: false,
        include_images: false,
        include_raw_content: false,
        max_results: 5,
        include_domains: [],
        exclude_domains: []
      })
    });

    if (!response.ok) {
      console.warn(`[Tavily] API error: ${response.status} ${response.statusText}`);
      return 'No live data available due to search error.';
    }

    const data = await response.json();
    if (data && data.results && Array.isArray(data.results)) {
      return data.results.map((r: any) => `Title: ${r.title}\nContent: ${r.content}\nURL: ${r.url}`).join('\n\n');
    }
    return 'No results found.';
  } catch (error: any) {
    console.warn(`[Tavily] Search failed: ${error.message}`);
    return 'No live data available due to search failure.';
  }
}

export interface Competitor {
  name: string;
  description: string;
  targetAudience: string;
  keyFeatures: string[];
  strengths: string[];
  weaknesses: string[];
  differenceFromOurIdea: string;
  threatLevel: string;
  category: string;
  source: string;
}

export interface CommunityRecommendation {
  platform: string;
  community: string;
  relevanceScore: number;
  reason: string;
  audienceType: string;
  feedbackType: string;
  communityRules?: string;
  url?: string;
}

export interface ResearchResult {
  competitors: Competitor[];
  communityRecommendations: CommunityRecommendation[];
}

export const researchAgent = {
  async research(
    ideaText: string,
    analysis: IdeaAnalysis,
    config?: SimulationConfig
  ): Promise<ResearchResult> {
    const region = config?.region !== 'global' && config?.region ? config.region.replace('_', ' ') : 'global';
    
    // Execute live web searches concurrently
    const competitorsQuery = `top competitors and alternatives for ${analysis.industry} targeting ${analysis.targetAudience} in ${region}`;
    const communitiesQuery = `best online communities forums subreddits for ${analysis.industry} and ${analysis.targetAudience} in ${region}`;
    
    const [competitorsWebData, communitiesWebData] = await Promise.all([
      performWebSearch(competitorsQuery),
      performWebSearch(communitiesQuery)
    ]);

    const lensInstructions = getLensInstruction(config);
    const systemInstruction = `You are a market research analyst and community intelligence expert. Given a product idea, its industry analysis, and LIVE WEB SEARCH RESULTS, you must: 1) Identify 5-8 competitors or similar products based on the web results and your own knowledge. 2) Identify 6-10 online communities/platforms where the target audience actively discusses problems this product solves based on the web results. Provide the platform name, specific community (e.g. r/SaaS), relevance score (0-100), reason for relevance, audience type, feedback type, and a direct URL to the community (e.g., https://reddit.com/r/SaaS). IMPORTANT: Rely heavily on the Live Web Search Data to ensure accuracy. If unsure, clearly mark source as inferred.\n${lensInstructions}`;
    
    const userPrompt = `Idea: ${ideaText}

Industry Analysis:
Industry: ${analysis.industry}
Target Audience: ${analysis.targetAudience}
Competitors (identified early): ${analysis.competitors.join(', ')}
Key Value Proposition: ${analysis.keyValueProposition}

--- LIVE WEB SEARCH DATA: COMPETITORS ---
${competitorsWebData}

--- LIVE WEB SEARCH DATA: COMMUNITIES ---
${communitiesWebData}`;
    const schema = {
      type: "object",
      properties: {
        competitors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              targetAudience: { type: "string" },
              keyFeatures: { type: "array", items: { type: "string" } },
              strengths: { type: "array", items: { type: "string" } },
              weaknesses: { type: "array", items: { type: "string" } },
              differenceFromOurIdea: { type: "string" },
              threatLevel: { type: "string", enum: ["high", "medium", "low"] },
              category: { type: "string", enum: ["direct", "indirect", "alternative", "adjacent"] },
              source: { type: "string", enum: ["researched", "inferred"] }
            },
            required: ["name", "description", "targetAudience", "keyFeatures", "strengths", "weaknesses", "differenceFromOurIdea", "threatLevel", "category", "source"]
          }
        },
        communityRecommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              platform: { type: "string" },
              community: { type: "string" },
              relevanceScore: { type: "number" },
              reason: { type: "string" },
              audienceType: { type: "string" },
              feedbackType: { type: "string" },
              communityRules: { type: "string" },
              url: { type: "string" }
            },
            required: ["platform", "community", "relevanceScore", "reason", "audienceType", "feedbackType", "url"]
          }
        }
      },
      required: ["competitors", "communityRecommendations"]
    };

    return await llmService.callLlmJSON<ResearchResult>(
      systemInstruction,
      userPrompt,
      'openai/gpt-4o',
      schema
    );
  }
};
