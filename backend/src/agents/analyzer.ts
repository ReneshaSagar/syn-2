import { llmService } from '../services/llm';
import { IdeaAnalysis } from '../types';
import {
  IDEA_ANALYZER_SYSTEM,
  formatIdeaAnalyzerPrompt,
  IDEA_ANALYZER_SCHEMA
} from '../prompts/templates';

export const analyzerAgent = {
  /**
   * Run the Idea Analyzer Agent
   */
  async analyzeIdea(ideaText: string): Promise<IdeaAnalysis> {
    if (!ideaText || ideaText.trim() === '') {
      throw new Error('Idea text cannot be empty.');
    }

    const systemInstruction = IDEA_ANALYZER_SYSTEM;
    const userPrompt = formatIdeaAnalyzerPrompt(ideaText);

    try {
      const result = await llmService.callLlmJSON<IdeaAnalysis>(
        systemInstruction,
        userPrompt,
        'openai/gpt-4o',
        IDEA_ANALYZER_SCHEMA
      );
      
      // Perform basic validation on schema fields, unless it explicitly needs more info
      if (!result.needsMoreInfo) {
        if (!result.industry || !result.targetAudience || !result.keyValueProposition) {
          throw new Error('Idea Analyzer Agent returned incomplete analysis data.');
        }
      }

      return {
        needsMoreInfo: result.needsMoreInfo || false,
        clarificationQuestions: result.clarificationQuestions || [],
        industry: result.industry || 'Unknown',
        targetAudience: result.targetAudience || 'Unknown',
        stakeholders: result.stakeholders || [],
        businessType: result.businessType || 'Unknown',
        competitors: result.competitors || [],
        keyValueProposition: result.keyValueProposition || 'Unknown',
        audienceComposition: result.audienceComposition || [],
        experts: result.experts || [],
        summary: result.summary || ''
      };
    } catch (error) {
      console.error('Error in analyzerAgent.analyzeIdea:', error);
      throw error;
    }
  }
};
