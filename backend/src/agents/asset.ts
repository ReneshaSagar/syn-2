import { llmService } from '../services/llm';
import { dbService } from '../services/database';

export const assetAgent = {
  async generateAsset(ideaId: string, concernOrRecommendation: string): Promise<string> {
    const idea = await dbService.getIdea(ideaId);
    if (!idea) throw new Error('Idea not found');

    const systemInstruction = `You are an elite, highly-paid Silicon Valley Product Manager and Copywriter.
Your client has a startup idea:
"${idea.rawText}"

During market research, the target audience raised the following concern or recommendation:
"${concernOrRecommendation}"

Your task is to generate a tangible, highly actionable "Asset" that solves this specific issue.
If it's a pricing concern, generate a 3-tier pricing strategy and the exact landing page copy.
If it's a feature recommendation, generate a product spec or user story for that feature.
If it's a trust issue, generate exact copy for a "Trust & Safety" page or guarantees.

Return ONLY the Markdown content for the asset. Do not include any meta-commentary like "Here is the asset." Make it look highly professional using Markdown formatting, headers, tables, and bold text where appropriate.`;

    const userPrompt = `Generate the asset to address this: "${concernOrRecommendation}"`;

    return await llmService.callLlmText(systemInstruction, userPrompt, 'anthropic/claude-3-5-sonnet-20240620');
  },

  async generateDraft(ideaId: string, platform: string, community: string): Promise<string> {
    const idea = await dbService.getIdea(ideaId);
    if (!idea) throw new Error('Idea not found');

    const systemInstruction = `You are a real, authentic startup founder. You hate corporate jargon and "AI-speak".
The user has a startup idea:
"${idea.rawText}"

Your task is to write a draft post to validate this idea on ${platform}, specifically targeting the ${community} community.

CRITICAL RULES:
1) SOUND HUMAN. Do not sound like a marketer, an AI, or a growth hacker. Be humble, conversational, and direct. Use phrases like "Hey guys, working on X..." or "Would love your brutally honest feedback."
2) PERFECTLY MATCH THE PLATFORM. If it's Reddit, format it like a text post (no hashtags, self-aware tone). If it's X/Twitter, write a short, punchy tweet thread. If it's Hacker News, write a plain-text "Show HN:" style post.
3) Be concise. Nobody reads massive walls of text.
4) Ask a specific question to spark engagement.
5) DO NOT include any AI pleasantries like "Here is your draft". Return ONLY the post content.`;

    const userPrompt = `Write the draft for ${platform} targeting ${community}.`;

    return await llmService.callLlmText(systemInstruction, userPrompt, 'anthropic/claude-3-5-sonnet-20240620');
  }
};
