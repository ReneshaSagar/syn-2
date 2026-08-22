import { llmService } from '../services/llm';
import { Persona, IdeaAnalysis, SimulationConfig } from '../types';
import {
  AUDIENCE_GENERATOR_SYSTEM,
  formatAudienceGeneratorPrompt,
  AUDIENCE_GENERATOR_SCHEMA,
  getLensInstruction
} from '../prompts/templates';
import * as crypto from 'crypto';

export const generatorAgent = {
  /**
   * Generates personas based on dynamic audience composition.
   */
  async generateAudience(ideaText: string, analysis: IdeaAnalysis, config?: SimulationConfig): Promise<Persona[]> {
    if (!ideaText) {
      throw new Error('Idea text is required to generate an audience.');
    }

    let segments = analysis.audienceComposition || [];
    if (segments.length === 0) {
      console.warn('No audience segments found in analysis, falling back to a generic segment.');
      segments = [{ name: 'General Audience', description: 'General users who might be interested in the concept.', count: 5 }];
    }

    // Apply Segment Priority Math
    if (config?.segmentPriority && config.segmentPriority.length > 0) {
      console.log('Applying segment priority distribution...', config.segmentPriority);
      const totalCount = segments.reduce((sum, s) => sum + (s.count || 5), 0);
      
      // Sort segments by their priority rank
      const prioritySegments = [...segments].sort((a, b) => {
        const indexA = config.segmentPriority!.indexOf(a.name);
        const indexB = config.segmentPriority!.indexOf(b.name);
        const rankA = indexA !== -1 ? indexA : 999;
        const rankB = indexB !== -1 ? indexB : 999;
        return rankA - rankB;
      });

      // Distribute counts based on rank (highest rank gets biggest weight)
      // Example for 4 segments: weights [4, 3, 2, 1]
      const n = prioritySegments.length;
      const totalWeight = (n * (n + 1)) / 2;
      let remainingCount = totalCount;

      prioritySegments.forEach((segment, idx) => {
        const weight = n - idx; // Highest rank gets weight 'n'
        if (idx === n - 1) {
          // Last segment gets whatever is left to avoid rounding errors
          segment.count = remainingCount;
        } else {
          const allocated = Math.round((weight / totalWeight) * totalCount);
          segment.count = allocated > 0 ? allocated : 1; // Ensure at least 1
          remainingCount -= segment.count;
        }
      });
      segments = prioritySegments;
    }

    const lensInstructions = getLensInstruction(config);
    const enhancedSystemInstruction = AUDIENCE_GENERATOR_SYSTEM + '\n' + lensInstructions;

    console.log('Generating synthetic audience in parallel batches...');
    
    try {
      const batchPromises = segments.map(async (segment) => {
        const userPrompt = formatAudienceGeneratorPrompt(ideaText, analysis, segment.name, segment.description, segment.count);
        
        const personas = await llmService.callLlmJSON<Persona[]>(
          enhancedSystemInstruction,
          userPrompt,
          'openai/gpt-4o-mini',
          AUDIENCE_GENERATOR_SCHEMA
        );

        if (!Array.isArray(personas)) {
          throw new Error(`Invalid persona response generated for segment: ${segment.name}`);
        }
        return personas;
      });

      const batchResults = await Promise.all(batchPromises);
      const combinedPersonas = batchResults.flat();

      if (combinedPersonas.length === 0) {
        throw new Error('Audience Generator Agent failed to return any personas.');
      }

      // Standardize and populate IDs
      const mappedPersonas: Persona[] = combinedPersonas.map((p, idx) => ({
        id: crypto.randomUUID(),
        name: p.name || `Persona ${idx + 1}`,
        age: p.age || 25,
        role: p.role || 'General Stakeholder',
        experience: p.experience || 'Not specified',
        motivations: Array.isArray(p.motivations) ? p.motivations.slice(0, 3) : [],
        frustrations: Array.isArray(p.frustrations) ? p.frustrations.slice(0, 3) : [],
        concerns: Array.isArray(p.concerns) ? p.concerns.slice(0, 3) : [],
        goals: Array.isArray(p.goals) ? p.goals.slice(0, 3) : [],
        personalityTraits: Array.isArray(p.personalityTraits) ? p.personalityTraits.slice(0, 3) : [],
        segment: p.segment || 'Unknown',
        location: p.location || 'Unknown',
        occupation: p.occupation || 'Unknown',
        technicalAbility: p.technicalAbility || 'medium',
        priceSensitivity: p.priceSensitivity || 'medium',
        riskTolerance: p.riskTolerance || 'medium',
        currentTools: Array.isArray(p.currentTools) ? p.currentTools : [],
        existingAlternatives: Array.isArray(p.existingAlternatives) ? p.existingAlternatives : [],
        painPoints: Array.isArray(p.painPoints) ? p.painPoints : [],
        preferences: Array.isArray(p.preferences) ? p.preferences : [],
        adoptionTendency: p.adoptionTendency || 'skeptic'
      }));

      console.log(`Successfully generated and merged ${mappedPersonas.length} synthetic audience personas.`);
      return mappedPersonas;
    } catch (error) {
      console.error('Error in generatorAgent.generateAudience:', error);
      throw error;
    }
  }
};
