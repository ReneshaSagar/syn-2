import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Idea, IdeaAnalysis, Persona, Simulation, SimulationResult, AggregateInsights, Report, VersionSnapshot, RedTeamReport, Competitor, CommunityRecommendation } from '../types';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Local File Fallback DB Store
class FileStoreDB {
  public data = {
    ideas: {} as Record<string, Idea>,
    personas: {} as Record<string, Persona[]>,
    simulations: {} as Record<string, Simulation[]>,
    reports: {} as Record<string, Report>,
    versions: {} as Record<string, VersionSnapshot[]>
  };
  
  private dbPath = path.join(process.cwd(), 'data', 'db.json');

  constructor() {
    if (fs.existsSync(this.dbPath)) {
      try {
        const fileContent = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(fileContent);
      } catch (e) {
        console.error('Failed to parse db.json, starting fresh.', e);
      }
    } else {
      if (!fs.existsSync(path.dirname(this.dbPath))) {
        fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
      }
      this.save();
    }
  }

  public save() {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
  }
}

const localStore = new FileStoreDB();

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
  console.log('ℹ️ Supabase environment variables not set or default. Running with Local File fallback database.');
}

export const dbService = {
  /**
   * Return all ideas stored locally for history sidebar
   */
  async getAllIdeasLocally(): Promise<Idea[]> {
    return Object.values(localStore.data.ideas).sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending
    });
  },

  /**
   * Save a new idea & its analysis
   */
  async saveIdea(rawText: string, analysis?: IdeaAnalysis, config?: any): Promise<Idea> {
    const id = crypto.randomUUID();
    const idea: Idea = {
      id,
      rawText,
      analysis,
      config,
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
          // Note: not adding config to supabase schema for now since this is primarily a local prototype
        });

      if (!error) return idea;
      console.error('Supabase saveIdea error:', error);
    }

    localStore.data.ideas[id] = idea;
    localStore.save();
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
            keyValueProposition: data.key_value_proposition,
            audienceComposition: [],
            experts: [],
            summary: ''
          },
          createdAt: new Date(data.created_at)
        } as any;
      }
    }

    return localStore.data.ideas[id] || null;
  },

  /**
   * Save generated personas for an idea
   */
  async savePersonas(ideaId: string, personas: Persona[]): Promise<Persona[]> {
    const personasWithIds = personas.map(p => ({
      ...p,
      id: p.id || crypto.randomUUID()
    }));

    if (supabase) {
      const rows = personasWithIds.map(p => ({
        id: p.id,
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

      const { error } = await supabase.from('personas').insert(rows);
      if (!error) return personasWithIds;
      console.error('Supabase savePersonas error:', error);
    }

    localStore.data.personas[ideaId] = personasWithIds;
    localStore.save();
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
    }

    return localStore.data.personas[ideaId] || [];
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

      const { error } = await supabase.from('simulations').insert(rows);
      if (!error) return list;
      console.error('Supabase saveSimulations error:', error);
    }

    localStore.data.simulations[ideaId] = list;
    localStore.save();
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
    }

    const sims = localStore.data.simulations[ideaId] || [];
    const personas = localStore.data.personas[ideaId] || [];
    return sims.map(s => ({
      ...s,
      persona: personas.find(p => p.id === s.personaId)
    }));
  },

  /**
   * Save final report
   */
  async saveReport(
    ideaId: string, 
    insights: AggregateInsights, 
    fullReportMarkdown: string,
    extras?: {
      redTeamReport?: RedTeamReport;
      competitors?: Competitor[];
      communityRecommendations?: CommunityRecommendation[];
      versionHistory?: VersionSnapshot[];
    }
  ): Promise<Report> {
    const id = crypto.randomUUID();
    const report: Report = {
      id,
      ideaId,
      insights,
      fullReportMarkdown,
      redTeamReport: extras?.redTeamReport,
      competitors: extras?.competitors,
      communityRecommendations: extras?.communityRecommendations,
      versionHistory: extras?.versionHistory,
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

      if (!error) return report;
      console.error('Supabase saveReport error:', error);
    }

    localStore.data.reports[ideaId] = report;
    localStore.save();
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
    }

    return localStore.data.reports[ideaId] || null;
  },

  /**
   * Save a version snapshot
   */
  async saveVersion(ideaId: string, snapshot: VersionSnapshot): Promise<VersionSnapshot> {
    const history = localStore.data.versions[ideaId] || [];
    history.push(snapshot);
    localStore.data.versions[ideaId] = history;
    localStore.save();
    return snapshot;
  },

  /**
   * Get version history
   */
  async getVersionHistory(ideaId: string): Promise<VersionSnapshot[]> {
    return localStore.data.versions[ideaId] || [];
  }
};
