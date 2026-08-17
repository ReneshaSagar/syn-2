import { llmService } from '../services/llm';
import { AggregateInsights, Persona, Simulation, SegmentAnalysis, SimulationConfidence } from '../types';
import {
  INSIGHT_GENERATOR_SYSTEM,
  formatInsightGeneratorPrompt,
  INSIGHT_GENERATOR_SCHEMA
} from '../prompts/templates';

export const insightsAgent = {
  /**
   * Run the Insight Generator Agent on simulated reactions
   */
  async generateInsights(
    ideaText: string,
    simulations: Simulation[],
    personas: Persona[]
  ): Promise<AggregateInsights> {
    if (!ideaText) {
      throw new Error('Idea text is required to generate insights.');
    }
    if (!simulations || simulations.length === 0) {
      throw new Error('Simulation results are required to generate insights.');
    }

    const segmentMap: Record<string, { personas: Persona[], simulations: Simulation[] }> = {};
    for (const persona of personas) {
      if (!segmentMap[persona.segment]) {
        segmentMap[persona.segment] = { personas: [], simulations: [] };
      }
      segmentMap[persona.segment].personas.push(persona);
    }
    for (const sim of simulations) {
      const persona = personas.find(p => p.id === sim.personaId);
      if (persona && segmentMap[persona.segment]) {
        segmentMap[persona.segment].simulations.push(sim);
      }
    }

    const computedSegments: SegmentAnalysis[] = [];
    for (const [segmentName, data] of Object.entries(segmentMap)) {
      const sims = data.simulations;
      if (sims.length === 0) continue;
      
      let sumInterest = 0;
      let sumExcitement = 0;
      let wouldTryCount = 0;
      let wouldPayCount = 0;
      
      for (const sim of sims) {
        sumInterest += sim.result.interestScore || 0;
        sumExcitement += sim.result.excitementScore || 0;
        if (sim.result.wouldTry) wouldTryCount++;
        if (sim.result.wouldPay) wouldPayCount++;
      }
      
      computedSegments.push({
        segmentName,
        count: sims.length,
        avgInterest: sumInterest / sims.length,
        avgExcitement: sumExcitement / sims.length,
        wouldTryPercent: (wouldTryCount / sims.length) * 100,
        wouldPayPercent: (wouldPayCount / sims.length) * 100,
        commonConcerns: [],
        positiveSignals: [],
        adoptionLikelihood: '',
        keyDifferences: []
      });
    }

    let totalInterest = 0;
    let totalWouldPayCount = 0;
    for (const sim of simulations) {
      totalInterest += sim.result.interestScore || 0;
      if (sim.result.wouldPay) totalWouldPayCount++;
    }
    const realOverallInterestScore = Math.round((totalInterest / simulations.length) * 10);
    const realAdoptionProbability = Math.round((totalWouldPayCount / simulations.length) * 100);

    const systemInstruction = INSIGHT_GENERATOR_SYSTEM;
    const userPrompt = formatInsightGeneratorPrompt(ideaText, simulations, computedSegments);

    try {
      const result = await llmService.callLlmJSON<AggregateInsights>(
        systemInstruction,
        userPrompt,
        'openai/gpt-4o-mini',
        INSIGHT_GENERATOR_SCHEMA
      );

      // Merge the computed segment data with the LLM's qualitative segment insights
      const finalSegments = computedSegments.map(computed => {
        const llmSeg = (result.segmentBreakdown || []).find((s: any) => s.segmentName === computed.segmentName);
        if (llmSeg) {
          return {
            ...computed,
            commonConcerns: llmSeg.commonConcerns || [],
            positiveSignals: llmSeg.positiveSignals || [],
            adoptionLikelihood: llmSeg.adoptionLikelihood || '',
            keyDifferences: llmSeg.keyDifferences || ''
          };
        }
        return computed;
      });

      return {
        overallInterestScore: realOverallInterestScore,
        adoptionProbability: realAdoptionProbability,
        topConcerns: Array.isArray(result.topConcerns) ? result.topConcerns : [],
        topSuggestions: Array.isArray(result.topSuggestions) ? result.topSuggestions : [],
        mostInterestedSegment: result.mostInterestedSegment || 'Not determined',
        leastInterestedSegment: result.leastInterestedSegment || 'Not determined',
        frequentlyAskedQuestions: Array.isArray(result.frequentlyAskedQuestions) ? result.frequentlyAskedQuestions : [],
        improvementRecommendations: Array.isArray(result.improvementRecommendations) ? result.improvementRecommendations : [],
        actionableRoadmap: Array.isArray(result.actionableRoadmap) ? result.actionableRoadmap : [],
        positiveSignals: Array.isArray(result.positiveSignals) ? result.positiveSignals : [],
        biggestOpportunity: result.biggestOpportunity || '',
        biggestRisk: result.biggestRisk || '',
        importantAssumptions: Array.isArray(result.importantAssumptions) ? result.importantAssumptions : [],
        confidence: result.confidence || { score: 50, highFactors: [], lowFactors: [] },
        segmentBreakdown: finalSegments
      };
    } catch (error) {
      console.error('Error in insightsAgent.generateInsights:', error);
      throw error;
    }
  }
};
