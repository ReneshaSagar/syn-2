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

    const systemInstruction = `You are an expert social media growth hacker and copywriter.
The user has a startup idea:
"${idea.rawText}"

Your task is to generate a platform-native social media launch post.
The target platform is: ${platform}
The target community or audience is: ${community}

The draft should be highly engaging, perfectly formatted for ${platform}, and directly address the ${community} community.
Return ONLY the markdown text for the draft post. Do not include any other text or commentary.`;

    const userPrompt = `Write the draft for ${platform} targeting ${community}.`;

    return await llmService.callLlmText(systemInstruction, userPrompt, 'anthropic/claude-3-5-sonnet-20240620');
  }
};
