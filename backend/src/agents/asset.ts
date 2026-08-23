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

    return await llmService.callLlmText(systemInstruction, userPrompt, 'openai/gpt-4o');
  },

  async generateDraft(ideaId: string, platform: string, community: string): Promise<string> {
    const idea = await dbService.getIdea(ideaId);
    if (!idea) throw new Error('Idea not found');

    const systemInstruction = `You are an authentic, scrappy startup founder pitching your idea to a community to get early validation and feedback.
    
Your startup idea:
"${idea.rawText}"

Your value proposition:
"${idea.analysis?.keyValueProposition || 'Not available'}"

Your task is to write a draft post to validate this idea on ${platform}, specifically targeting the ${community} community.

CRITICAL RULES:
1) PITCH, DO NOT SUMMARIZE. Do not talk about "scores", "simulation", "personas", or "research". You are pitching the actual product idea to real humans to see if they'd use it.
2) SOUND HUMAN. Do not sound like a marketer, an AI, or a growth hacker. Be humble, conversational, and direct.
3) ZERO BUZZWORDS. Ban the words: revolutionize, game-changer, robust, delve, comprehensive, cutting-edge, ultimate, synergy, unlock.
4) PERFECTLY MATCH THE PLATFORM. 
   - If Reddit: Format as a genuine text post. Be self-aware. No hashtags.
   - If Twitter/X: Short, punchy thread.
   - If Hacker News: "Show HN:" style, highly technical and plain text.
5) Keep it short and readable. End with a specific question asking for brutal, honest feedback.
6) OUTPUT ONLY THE POST CONTENT. No intro like "Here is the draft:". No markdown code blocks surrounding the text unless it's for formatting the post itself.`;

    const userPrompt = `Write the draft for ${platform} targeting ${community}.`;

    return await llmService.callLlmText(systemInstruction, userPrompt, 'openai/gpt-4o');
  }
};
