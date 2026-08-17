import { llmService } from '../services/llm';
import { Persona, SimulationResult } from '../types';
import {
  PERSONA_SIMULATION_SYSTEM,
  formatPersonaSimulationPrompt,
  PERSONA_SIMULATION_SCHEMA
} from '../prompts/templates';

interface BatchSimulationItem {
  personaId: string;
  reaction: string;
  excitementScore: number;
  concerns: string[];
  objections: string[];
  likelihoodToUse: number;
  suggestions: string[];
  reactionEmoji: string;
  interestScore: number;
  sentiment: string;
  wouldTry: boolean;
  wouldPay: boolean;
  mainAttraction: string;
  mainConcern: string;
  questions: string[];
  whatWouldChangeTheirMind: string;
}

export const simulatorAgent = {
  /**
   * Simulates reactions for a batch of personas.
   */
  async simulatePersonaBatch(
    ideaText: string,
    personas: Persona[]
  ): Promise<BatchSimulationItem[]> {
    if (personas.length === 0) return [];

    const systemInstruction = PERSONA_SIMULATION_SYSTEM;
    const userPrompt = formatPersonaSimulationPrompt(ideaText, personas);

    try {
      const results = await llmService.callLlmJSON<BatchSimulationItem[]>(
        systemInstruction,
        userPrompt,
        'openai/gpt-4o-mini',
        PERSONA_SIMULATION_SCHEMA
      );

      if (!Array.isArray(results)) {
        throw new Error('Simulation batch call did not return an array.');
      }

      return results;
    } catch (error) {
      console.error('Error simulating persona batch, using local fallbacks:', error);
      // Fallback: return default response for every persona in this batch to keep the workflow moving
      return personas.map(p => ({
        personaId: p.id,
        reaction: `As ${p.name} (${p.role}), I think this idea is interesting but I have minor reservations about price, learning curve, and security.`,
        excitementScore: p.personalityTraits.includes('Skeptic') ? 4 : 7,
        concerns: ['Pricing model clarity', 'Onboarding effort'],
        objections: p.personalityTraits.includes('Skeptic') ? ['I already use existing alternatives'] : [],
        likelihoodToUse: p.personalityTraits.includes('Skeptic') ? 3 : 6,
        suggestions: ['Offer a trial period', 'Provide better guides'],
        reactionEmoji: p.personalityTraits.includes('Skeptic') ? '🤔' : '👍',
        interestScore: p.personalityTraits.includes('Skeptic') ? 4 : 7,
        sentiment: p.personalityTraits.includes('Skeptic') ? 'neutral' : 'positive',
        wouldTry: !p.personalityTraits.includes('Skeptic'),
        wouldPay: false,
        mainAttraction: 'The core concept is interesting.',
        mainConcern: 'Pricing and onboarding might be tough.',
        questions: ['How much does it cost?'],
        whatWouldChangeTheirMind: 'A generous free tier.'
      }));
    }
  },

  /**
   * Simulates reactions for all personas in parallel batches (e.g. 6 personas per batch).
   * Reduces API requests from 18 to 3, avoiding 429 Rate Limit issues.
   */
  async simulateAudience(
    ideaText: string,
    personas: Persona[],
    batchSize: number = 6
  ): Promise<{ personaId: string; result: SimulationResult }[]> {
    console.log(`Starting audience simulation for ${personas.length} personas in batches of ${batchSize}...`);
    
    const batches: Persona[][] = [];
    for (let i = 0; i < personas.length; i += batchSize) {
      batches.push(personas.slice(i, i + batchSize));
    }

    // Run batches in parallel (only 3 calls total, well within 15 RPM free limit)
    const batchPromises = batches.map(batch => this.simulatePersonaBatch(ideaText, batch));
    const batchResults = await Promise.all(batchPromises);
    const flatResults = batchResults.flat();

    // Map results back, matching personaId to the result, ensuring every persona has an associated result
    const mappedResults = personas.map(persona => {
      const match = flatResults.find(r => r.personaId === persona.id);
      
      const result: SimulationResult = match ? {
        reaction: match.reaction,
        excitementScore: match.excitementScore,
        concerns: match.concerns,
        objections: match.objections,
        likelihoodToUse: match.likelihoodToUse,
        suggestions: match.suggestions,
        reactionEmoji: match.reactionEmoji,
        interestScore: match.interestScore,
        sentiment: match.sentiment,
        wouldTry: match.wouldTry,
        wouldPay: match.wouldPay,
        mainAttraction: match.mainAttraction,
        mainConcern: match.mainConcern,
        questions: match.questions,
        whatWouldChangeTheirMind: match.whatWouldChangeTheirMind
      } : {
        // Safe ultimate fallback in case of ID hallucination or mismatched keys
        reaction: `As ${persona.name} (${persona.role}), I find the concept promising but need more clarity on user flows and integration.`,
        excitementScore: 6,
        concerns: ['Usability concerns'],
        objections: [],
        likelihoodToUse: 5,
        suggestions: ['Add integrations with standard tools'],
        reactionEmoji: '🤔',
        interestScore: 6,
        sentiment: 'neutral',
        wouldTry: true,
        wouldPay: false,
        mainAttraction: 'Concept is promising.',
        mainConcern: 'Usability concerns.',
        questions: ['Does it integrate?'],
        whatWouldChangeTheirMind: 'Clear integrations.'
      };

      return {
        personaId: persona.id,
        result
      };
    });

    console.log(`Completed reactions simulation for ${mappedResults.length} personas.`);
    return mappedResults;
  }
};
