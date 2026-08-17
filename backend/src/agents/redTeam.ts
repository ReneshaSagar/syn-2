import { llmService } from '../services/llm';
import { Persona, Simulation } from '../types';

export interface RedTeamReport {
  overallRiskLevel: string;
  hiddenAssumptions: { assumption: string; severity: string; evidence: string; recommendation: string }[];
  competitiveThreats: string[];
  adoptionBarriers: string[];
  pricingProblems: string[];
  trustAndPrivacyConcerns: string[];
  contradictionsBetweenPersonas: string[];
  summary: string;
}

export const redTeamAgent = {
  async analyze(
    ideaText: string,
    personas: Persona[],
    simulations: Simulation[],
    segmentAnalysis?: any[]
  ): Promise<RedTeamReport> {
    const systemInstruction = 'You are a ruthless devil\'s advocate and red team analyst. Your ONLY job is to find fatal flaws, hidden assumptions, and reasons why this idea will FAIL. You are not here to be supportive. Analyze the idea, the persona reactions, and find: hidden assumptions the founder is making, weak target markets, existing alternatives that personas mentioned, adoption barriers, pricing problems, technical/privacy/trust concerns, competition signals, and contradictions between different persona responses. Be specific and cite evidence from the persona reactions. Rate overall risk level as critical/high/medium/low.';
    
    const personaSummary = personas.map(p => {
      const sim = simulations.find(s => s.personaId === p.id);
      const res = sim?.result;
      return `Name: ${p.name}, Role: ${p.role}\n` +
             `Excitement Score: ${res?.excitementScore ?? 'N/A'}/10\n` +
             `Concerns: ${res?.concerns?.join(', ') ?? 'None'}\n` +
             `Objections: ${res?.objections?.join(', ') ?? 'None'}\n` +
             `Likelihood to Use/Pay: ${res?.likelihoodToUse ?? 'N/A'}/10`;
    }).join('\n\n');

    const userPrompt = `Idea: ${ideaText}\n\nPersona Reactions:\n${personaSummary}`;

    const schema = {
      type: "object",
      properties: {
        overallRiskLevel: { type: "string" },
        hiddenAssumptions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              assumption: { type: "string" },
              severity: { type: "string" },
              evidence: { type: "string" },
              recommendation: { type: "string" }
            },
            required: ["assumption", "severity", "evidence", "recommendation"]
          }
        },
        competitiveThreats: { type: "array", items: { type: "string" } },
        adoptionBarriers: { type: "array", items: { type: "string" } },
        pricingProblems: { type: "array", items: { type: "string" } },
        trustAndPrivacyConcerns: { type: "array", items: { type: "string" } },
        contradictionsBetweenPersonas: { type: "array", items: { type: "string" } },
        summary: { type: "string" }
      },
      required: ["overallRiskLevel", "hiddenAssumptions", "competitiveThreats", "adoptionBarriers", "pricingProblems", "trustAndPrivacyConcerns", "contradictionsBetweenPersonas", "summary"]
    };

    return await llmService.callLlmJSON<RedTeamReport>(
      systemInstruction,
      userPrompt,
      'openai/gpt-4o',
      schema
    );
  }
};
