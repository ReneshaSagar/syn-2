import { llmService } from '../services/llm';
import { AggregateInsights, Persona, Simulation } from '../types';
import {
  REPORT_GENERATOR_SYSTEM,
  formatReportGeneratorPrompt
} from '../prompts/templates';

export const reporterAgent = {
  /**
   * Run the Report Generator Agent to produce a beautiful markdown report.
   */
  async generateReport(
    ideaText: string,
    personas: Persona[],
    simulations: Simulation[],
    insights: AggregateInsights,
    redTeamReport?: any,
    competitors?: any[],
    communityRecommendations?: any[]
  ): Promise<string> {
    if (!ideaText) {
      throw new Error('Idea text is required to generate the report.');
    }
    
    const systemInstruction = REPORT_GENERATOR_SYSTEM;
    const userPrompt = formatReportGeneratorPrompt(ideaText, personas, simulations, insights, redTeamReport, competitors, communityRecommendations);

    try {
      const reportMarkdown = await llmService.callLlmText(
        systemInstruction,
        userPrompt,
        'openai/gpt-4o'
      );

      if (!reportMarkdown || reportMarkdown.trim() === '') {
        throw new Error('Report Generator Agent returned an empty report.');
      }

      return reportMarkdown;
    } catch (error) {
      console.error('Error in reporterAgent.generateReport:', error);
      throw error;
    }
  }
};
