import { llmService } from '../services/llm';
import { dbService } from '../services/database';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const chatAgent = {
  async handleChat(
    ideaId: string,
    messages: ChatMessage[],
    context?: { type: 'persona' | 'general'; targetId?: string }
  ): Promise<string> {
    const idea = await dbService.getIdea(ideaId);
    if (!idea) throw new Error('Idea not found');
    
    const personas = await dbService.getPersonas(ideaId);
    const simulations = await dbService.getSimulations(ideaId);
    const report = await dbService.getReport(ideaId);

    let systemInstruction = '';
    
    if (context?.type === 'persona' && context.targetId) {
      const persona = personas.find(p => p.id === context.targetId);
      const simulation = simulations.find(s => s.personaId === context.targetId);
      
      if (!persona) throw new Error('Persona not found');

      systemInstruction = `You are ${persona.name}, a ${persona.age}-year-old ${persona.role}.
Experience: ${persona.experience}
Personality: ${persona.personalityTraits.join(', ')}

You recently evaluated a new product/startup idea:
"${idea.rawText}"

Your initial reaction was:
"${simulation?.result.reaction}"

Your core concerns: ${simulation?.result.concerns.join(', ')}
Your objections to buying: ${simulation?.result.objections.join(', ')}
Your suggestions: ${simulation?.result.suggestions.join(', ')}

You are now being interviewed by the product creator. Answer their questions directly, staying completely IN CHARACTER. Be helpful but honest about your reservations. Do not break character. Do not say "As an AI..."`;
    } else {
      // General Analyst Mode
      systemInstruction = `You are a Principal Product Analyst. You have just completed a synthetic audience simulation and analysis for the following idea:
"${idea.rawText}"

Here are the key insights from your analysis:
Most Interested Segment: ${report?.insights.mostInterestedSegment}
Top Concerns: ${report?.insights.topConcerns?.join(', ')}
Top Suggestions: ${report?.insights.improvementRecommendations?.join(', ')}

The user is the creator of this idea. They are asking you follow-up questions about your report and the audience's reactions. Be an expert, objective, and highly actionable consultant. Use markdown for formatting.`;
    }

    return await llmService.callLlmChat(systemInstruction, messages, 'openai/gpt-4o');
  },

  async summarizeChatToPivot(messages: ChatMessage[]): Promise<string> {
    const systemInstruction = `You are an expert product strategist. Your task is to analyze the conversation history between a user (the founder) and an AI analyst/persona, and determine exactly how the user wants to pivot or modify their original idea based on the discussion.
Output ONLY a single, clear, concise instruction describing the pivot (e.g., "The user wants to pivot to a B2B model and charge $99/mo"). Do not include any other text.`;
    
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const userPrompt = `Conversation history:\n${conversation}\n\nWhat is the clear, concise pivot instruction based on this conversation?`;

    return await llmService.callLlmText(systemInstruction, userPrompt, 'openai/gpt-4o');
  }
};
