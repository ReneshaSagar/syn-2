import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Idea, IdeaAnalysis, Persona, Simulation, SimulationResult, AggregateInsights, Report, VersionSnapshot } from '../types';
import * as crypto from 'crypto';

// In-Memory Fallback DB Store
class InMemoryDB {
  public ideas: Map<string, Idea> = new Map();
  public personas: Map<string, Persona[]> = new Map(); // idea_id -> Persona[]
  public simulations: Map<string, Simulation[]> = new Map(); // idea_id -> Simulation[]
  public reports: Map<string, Report> = new Map(); // idea_id -> Report
  public versions: Map<string, VersionSnapshot[]> = new Map();
}

const localStore = new InMemoryDB();

// Initialize Supabase Client
let supabase: SupabaseClient | null = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_url_here' && supabaseKey !== 'your_supabase_anon_key_here') {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('⚡ Supabase Client initialized successfully.');
  } catch (error) {
    console.error('⚠️ Failed to initialize Supabase client:', error);
  }
} else {
  console.log('ℹ️ Supabase environment variables not set or default. Running with In-Memory fallback database.');
}

export const dbService = {
  /**
   * Save a new idea & its analysis
   */
  async saveIdea(rawText: string, analysis?: IdeaAnalysis): Promise<Idea> {
    const id = crypto.randomUUID();
    const idea: Idea = {
      id,
      rawText,
      analysis,
      createdAt: new Date()
    };

    if (supabase) {
      const { error } = await supabase
        .from('ideas')
        .insert({
          id,
          raw_text: rawText,
          industry: analysis?.industry,
          target_audience: analysis?.targetAudience,
          stakeholders: analysis?.stakeholders,
          business_type: analysis?.businessType,
          competitors: analysis?.competitors,
          key_value_proposition: analysis?.keyValueProposition
        });

      if (!error) {
        return idea;
      }
      console.error('Supabase saveIdea error:', error);
      console.log('Falling back to local store for saveIdea');
    }

    localStore.ideas.set(id, idea);
    return idea;
  },

  /**
   * Get an idea by ID
   */
  async getIdea(id: string): Promise<Idea | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          rawText: data.raw_text,
          analysis: {
            industry: data.industry,
            targetAudience: data.target_audience,
            stakeholders: data.stakeholders,
            businessType: data.business_type,
            competitors: data.competitors,
            keyValueProposition: data.key_value_proposition
          } as any,
          createdAt: new Date(data.created_at)
        } as any;
      }
      console.error('Supabase getIdea error:', error);
    }

    return localStore.ideas.get(id) || null;
  },

  /**
   * Save generated personas for an idea
   */
  async savePersonas(ideaId: string, personas: Persona[]): Promise<Persona[]> {
    if (supabase) {
      const rows = personas.map(p => ({
        id: p.id || crypto.randomUUID(),
        idea_id: ideaId,
        name: p.name,
        age: p.age,
        role: p.role,
        experience: p.experience,
        motivations: p.motivations,
        frustrations: p.frustrations,
        concerns: p.concerns,
        goals: p.goals,
        personality_traits: p.personalityTraits
      }));

      const { error } = await supabase
        .from('personas')
        .insert(rows);

      if (!error) {
        // Return updated personas with generated ids
        return rows.map(r => ({
          id: r.id,
          name: r.name,
          age: r.age,
          role: r.role,
          experience: r.experience,
          motivations: r.motivations,
          frustrations: r.frustrations,
          concerns: r.concerns,
          goals: r.goals,
          personalityTraits: r.personality_traits
        })) as any;
      }
      console.error('Supabase savePersonas error:', error);
      console.log('Falling back to local store for savePersonas');
    }

    // Ensure all personas have IDs
    const personasWithIds = personas.map(p => ({
      ...p,
      id: p.id || crypto.randomUUID()
    }));
    localStore.personas.set(ideaId, personasWithIds);
    return personasWithIds;
  },

  /**
   * Get personas generated for an idea
   */
  async getPersonas(ideaId: string): Promise<Persona[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('idea_id', ideaId);

      if (!error && data) {
        return data.map(d => ({
          id: d.id,
          name: d.name,
          age: d.age,
          role: d.role,
          experience: d.experience,
          motivations: d.motivations,
          frustrations: d.frustrations,
          concerns: d.concerns,
          goals: d.goals,
          personalityTraits: d.personality_traits
        })) as any;
      }
      console.error('Supabase getPersonas error:', error);
    }

    return localStore.personas.get(ideaId) || [];
  },

  /**
   * Save simulation reactions
   */
  async saveSimulations(ideaId: string, simulations: { personaId: string, result: SimulationResult }[]): Promise<Simulation[]> {
    const list: Simulation[] = simulations.map(s => ({
      id: crypto.randomUUID(),
      ideaId,
      personaId: s.personaId,
      result: s.result,
      createdAt: new Date()
    }));

    if (supabase) {
      const rows = list.map(s => ({
        id: s.id,
        idea_id: ideaId,
        persona_id: s.personaId,
        reaction: s.result.reaction,
        excitement_score: s.result.excitementScore,
        concerns: s.result.concerns,
        objections: s.result.objections,
        likelihood_to_use: s.result.likelihoodToUse,
        suggestions: s.result.suggestions
      }));

      const { error } = await supabase
        .from('simulations')
        .insert(rows);

      if (!error) {
        return list;
      }
      console.error('Supabase saveSimulations error:', error);
      console.log('Falling back to local store for saveSimulations');
    }

    localStore.simulations.set(ideaId, list);
    return list;
  },

  /**
   * Get simulations for an idea
   */
  async getSimulations(ideaId: string): Promise<Simulation[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('simulations')
        .select('*, personas(*) ')
        .eq('idea_id', ideaId);

      if (!error && data) {
        return data.map(d => ({
          id: d.id,
          ideaId: d.idea_id,
          personaId: d.persona_id,
          persona: (d.personas ? {
            id: d.personas.id,
            name: d.personas.name,
            age: d.personas.age,
            role: d.personas.role,
            experience: d.personas.experience,
            motivations: d.personas.motivations,
            frustrations: d.personas.frustrations,
            concerns: d.personas.concerns,
            goals: d.personas.goals,
            personalityTraits: d.personas.personality_traits
          } : undefined) as any,
          result: {
            reaction: d.reaction,
            excitementScore: d.excitement_score,
            concerns: d.concerns,
            objections: d.objections,
            likelihoodToUse: d.likelihood_to_use,
            suggestions: d.suggestions
          } as any,
          createdAt: new Date(d.created_at)
        })) as any;
      }
      console.error('Supabase getSimulations error:', error);
    }

    // Attach personas to simulation items from memory
    const sims = localStore.simulations.get(ideaId) || [];
    const personas = localStore.personas.get(ideaId) || [];
    return sims.map(s => ({
      ...s,
      persona: personas.find(p => p.id === s.personaId)
    }));
  },

  /**
   * Save final report
   */
  async saveReport(ideaId: string, insights: AggregateInsights, fullReportMarkdown: string): Promise<Report> {
    const id = crypto.randomUUID();
    const report: Report = {
      id,
      ideaId,
      insights,
      fullReportMarkdown,
      createdAt: new Date()
    };

    if (supabase) {
      const { error } = await supabase
        .from('reports')
        .insert({
          id,
          idea_id: ideaId,
          overall_interest_score: insights.overallInterestScore,
          adoption_probability: insights.adoptionProbability,
          top_concerns: insights.topConcerns,
          top_suggestions: insights.topSuggestions,
          most_interested_segment: insights.mostInterestedSegment,
          least_interested_segment: insights.leastInterestedSegment,
          frequently_asked_questions: insights.frequentlyAskedQuestions,
          improvement_opportunities: insights.improvementRecommendations,
          actionable_roadmap: insights.actionableRoadmap,
          full_report_markdown: fullReportMarkdown
        });

      if (!error) {
        return report;
      }
      console.error('Supabase saveReport error:', error);
      console.log('Falling back to local store for saveReport');
    }

    localStore.reports.set(ideaId, report);
    return report;
  },

  /**
   * Get report for an idea
   */
  async getReport(ideaId: string): Promise<Report | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('idea_id', ideaId)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          ideaId: data.idea_id,
          insights: {
            overallInterestScore: data.overall_interest_score,
            adoptionProbability: data.adoption_probability,
            topConcerns: data.top_concerns,
            topSuggestions: data.top_suggestions,
            mostInterestedSegment: data.most_interested_segment,
            leastInterestedSegment: data.least_interested_segment,
            frequentlyAskedQuestions: data.frequently_asked_questions,
            improvementRecommendations: data.improvement_opportunities,
            actionableRoadmap: data.actionable_roadmap || []
          } as any,
          fullReportMarkdown: data.full_report_markdown,
          createdAt: new Date(data.created_at)
        } as any;
      }
      console.error('Supabase getReport error:', error);
    }

    return localStore.reports.get(ideaId) || null;
  },

  /**
   * Save a version snapshot
   */
  async saveVersion(ideaId: string, snapshot: VersionSnapshot): Promise<VersionSnapshot> {
    const history = localStore.versions.get(ideaId) || [];
    history.push(snapshot);
    localStore.versions.set(ideaId, history);
    return snapshot;
  },

  /**
   * Get version history
   */
  async getVersionHistory(ideaId: string): Promise<VersionSnapshot[]> {
    return localStore.versions.get(ideaId) || [];
  }
};
