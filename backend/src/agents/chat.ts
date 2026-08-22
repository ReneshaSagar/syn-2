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
    context?: { type: 'persona' | 'general' | 'debate' | 'debate-conclusion'; targetId?: string; topic?: string }
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

You are now being interviewed by the product creator. Answer their questions directly, staying completely IN CHARACTER. Be helpful but honest about your reservations. Do not break character. Do not say "As an AI...".

CRITICAL RULE: If the product creator completely resolves your concerns or convinces you, or if they say something that makes you lose all interest, you MUST update your excitement score (0-100) by appending a tag at the very end of your message like this: [[SCORE: 85]]. If your opinion hasn't significantly changed, do not include the tag.`;
    } else if (context?.type === 'debate' && context.targetId) {
      const persona = personas.find(p => p.id === context.targetId);
      const simulation = simulations.find(s => s.personaId === context.targetId);
      const topic = context.topic || 'the validity and potential of this idea';
      
      if (!persona) throw new Error('Persona not found');

      systemInstruction = `You are ${persona.name}, a ${persona.age}-year-old ${persona.role}.
Experience: ${persona.experience}
Personality: ${persona.personalityTraits.join(', ')}

You recently evaluated a new product/startup idea:
"${idea.rawText}"

Your initial reaction was:
"${simulation?.result.reaction}"

You are now engaging in a fierce, live debate against another persona regarding: ${topic}.
The opposing persona's arguments will appear as messages from the "user".
CRITICAL INSTRUCTIONS:
- Vigorously defend your perspective based on your background and initial reaction.
- Directly attack or rebut the opponent's arguments.
- Keep your responses punchy, concise, and conversational (1-2 short paragraphs max).
- Do not break character. Do not say "As an AI...". Speak directly to your opponent.`;
    } else if (context?.type === 'debate-conclusion') {
      systemInstruction = `You are a master debate moderator. The founder organized a debate between two distinct personas regarding the idea: "${idea.rawText}".
Read the conversation history (provided by the user) and provide a punchy 1-2 sentence conclusion stating who made the stronger points, and the final takeaway for the founder. Do NOT write a long summary. Declare a winner if one side clearly dominated.`;
    } else {
      // General Analyst Mode
      systemInstruction = `You are the Head of Synthetic R&D. You have just completed a synthetic audience simulation for the founder's idea:
"${idea.rawText}"

Insights from the report:
Most Interested Segment: ${report?.insights.mostInterestedSegment}
Top Concerns: ${report?.insights.topConcerns?.join(', ')}
Top Suggestions: ${report?.insights.improvementRecommendations?.join(', ')}

The user is the founder. You are chatting with them.
CRITICAL INSTRUCTIONS:
- Be highly conversational, concise, and humane, like chatting with a colleague on Slack.
- DO NOT write giant multi-paragraph essays or dump long lists unless explicitly asked.
- Give short, punchy, direct answers. Let the user guide the conversation.
- Use a friendly, collaborative, and refined tone (like ChatGPT/Claude in conversational mode).`;
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
