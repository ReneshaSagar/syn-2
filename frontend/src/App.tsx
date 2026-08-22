import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { SimulationView } from './components/SimulationView';
import { ReportDashboard } from './components/ReportDashboard';
import { ClarificationView } from './components/ClarificationView';
import { Moon, Sun } from 'lucide-react';
import { 
  analyzeIdea, generateAudience, simulate, generateReport, loadIdeaState,
  type IdeaAnalysis, type Persona, type Simulation, type Report,
  type RedTeamReport, type Competitor, type CommunityRecommendation, type VersionSnapshot,
  type SimulationConfig, DEFAULT_CONFIG
} from './services/api';

type AppState = 'landing' | 'clarification' | 'simulation' | 'report';
type SimStatus = 'analyzing' | 'generating' | 'simulating' | 'done';

function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [simStatus, setSimStatus] = useState<SimStatus>('analyzing');
  
  const [analysis, setAnalysis] = useState<IdeaAnalysis | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [redTeamReport, setRedTeamReport] = useState<RedTeamReport | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [communityRecommendations, setCommunityRecommendations] = useState<CommunityRecommendation[]>([]);
  const [versionHistory, setVersionHistory] = useState<VersionSnapshot[]>([]);
  const [activeConfig, setActiveConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);

  const [originalIdea, setOriginalIdea] = useState('');
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);

  // Dark mode state
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check system preference on load
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    setIsDark(!isDark);
  };

  const startSimulationProcess = async (idea: string, config: SimulationConfig = activeConfig, skipClarification: boolean = false) => {
    try {
      if (!skipClarification) {
        setOriginalIdea(idea);
        setActiveConfig(config);
      }
      setAppState('simulation');
      
      // Step 1: Analyze Idea
      setSimStatus('analyzing');
      const analysisResult = await analyzeIdea(idea, config);
      setAnalysis(analysisResult.analysis);

      // Handle Clarification Step
      if (analysisResult.analysis.needsMoreInfo && !skipClarification) {
        setClarificationQuestions(analysisResult.analysis.clarificationQuestions || []);
        setAppState('clarification');
        return; // Pause the pipeline
      }

      const ideaId = analysisResult.ideaId;

      // Step 2: Generate Audience
      setSimStatus('generating');
      const audienceResult = await generateAudience(ideaId, config);
      setPersonas(audienceResult.personas);

      // Step 3: Simulate Reactions
      setSimStatus('simulating');
      const simResult = await simulate(ideaId, config);
      setSimulations(simResult.simulations);

      // Step 4: Generate Report
      setSimStatus('done');
      const reportResult = await generateReport(ideaId, config);
      setReport(reportResult.report);
      if (reportResult.redTeamReport) setRedTeamReport(reportResult.redTeamReport);
      if (reportResult.competitors) setCompetitors(reportResult.competitors);
      if (reportResult.communityRecommendations) setCommunityRecommendations(reportResult.communityRecommendations);

      // Wait a moment for users to see the "done" state and thoughts, then show report
      setTimeout(() => {
        setAppState('report');
      }, 5000);

    } catch (error) {
      console.error('Error during simulation pipeline:', error);
      alert('An error occurred during the simulation. Please make sure the backend is running and Gemini API key is configured properly.');
      setAppState('landing');
    }
  };

  const restart = () => {
    setAppState('landing');
    setOriginalIdea('');
    setClarificationQuestions([]);
    setAnalysis(null);
    setPersonas([]);
    setSimulations([]);
    setReport(null);
    setRedTeamReport(null);
    setCompetitors([]);
    setCommunityRecommendations([]);
    setVersionHistory([]);
  };

  const reanalyzeWithPriority = async (segmentPriority: string[]) => {
    if (!analysis) return;
    try {
      const config = { ...activeConfig, segmentPriority };
      setActiveConfig(config);
      setAppState('simulation');
      
      const ideaId = analysis.ideaId; // Wait, analysis in frontend might not have ideaId directly on the object.
      // Wait, is ideaId on analysis? Let's check `startSimulationProcess`. It's `analysisResult.ideaId`.
      // Where do we store ideaId? `report.ideaId` or `analysis.id`?
      // Actually `report.ideaId` exists.
      const currentIdeaId = report?.ideaId;
      if (!currentIdeaId) throw new Error("No idea ID found");

      // Step 2: Generate Audience
      setSimStatus('generating');
      const audienceResult = await generateAudience(currentIdeaId, config);
      setPersonas(audienceResult.personas);

      // Step 3: Simulate Reactions
      setSimStatus('simulating');
      const simResult = await simulate(currentIdeaId, config);
      setSimulations(simResult.simulations);

      // Step 4: Generate Report
      setSimStatus('done');
      const reportResult = await generateReport(currentIdeaId, config);
      setReport(reportResult.report);
      if (reportResult.redTeamReport) setRedTeamReport(reportResult.redTeamReport);
      if (reportResult.competitors) setCompetitors(reportResult.competitors);
      if (reportResult.communityRecommendations) setCommunityRecommendations(reportResult.communityRecommendations);
      
      setAppState('report');
    } catch (error) {
      console.error('Error during prioritized reanalysis:', error);
      alert('An error occurred during reanalysis.');
      setAppState('report');
    }
  };

  const handleClarificationSubmit = (answers: string) => {
    const combinedIdea = `${originalIdea}\n\nAdditional Context Provided by User:\n${answers}`;
    startSimulationProcess(combinedIdea, true);
  };

  const handleLoadHistory = async (ideaId: string) => {
    try {
      setAppState('simulation');
      setSimStatus('analyzing');
      
      const data = await loadIdeaState(ideaId);
      
      setAnalysis(data.analyzedIdea);
      setPersonas(data.personas || []);
      setSimulations(data.simulations || []);
      setReport(data.report);
      setVersionHistory(data.versionHistory || []);
      setRedTeamReport(data.report?.redTeamReport || null);
      setCompetitors(data.report?.competitors || []);
      setCommunityRecommendations(data.report?.communityRecommendations || []);
      
      setTimeout(() => {
        setAppState('report');
      }, 500);
    } catch (err) {
      console.error('Failed to load history', err);
      alert('Failed to load historical idea.');
      setAppState('landing');
    }
  };

  return (
    <div className="min-h-screen bg-framer-bg dark:bg-[#050505] transition-colors duration-500">
      
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleDarkMode}
        className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] shadow-sm hover:shadow-md dark:text-white transition-all"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {appState === 'landing' && (
        <LandingPage 
          onSubmitIdea={(idea, config) => startSimulationProcess(idea, config, false)} 
          onLoadHistory={handleLoadHistory}
        />
      )}
      
      {appState === 'clarification' && (
        <ClarificationView 
          questions={clarificationQuestions} 
          onSubmit={handleClarificationSubmit} 
        />
      )}
      
      {appState === 'simulation' && (
        <SimulationView 
          status={simStatus} 
          analysis={analysis}
          personas={personas} 
          simulations={simulations} 
        />
      )}
      
      {appState === 'report' && report && (
        <ReportDashboard 
          report={report} 
          analysis={analysis}
          personas={personas}
          simulations={simulations}
          redTeamReport={redTeamReport}
          competitors={competitors}
          communityRecommendations={communityRecommendations}
          versionHistory={versionHistory}
          onRestart={restart} 
          onGenerateRedTeam={async () => {
            const { generateRedTeamAnalysis } = await import('./services/api');
            const res = await generateRedTeamAnalysis(report!.ideaId);
            setRedTeamReport(res.redTeamReport);
          }}
          onReanalyzeWithPriority={reanalyzeWithPriority}
          onPivotComplete={(result) => {
            if (report) {
              setVersionHistory(result.versionHistory || []);
            }
            setAnalysis(result.analyzedIdea);
            setPersonas(result.personas);
            setSimulations(result.simulations);
            setReport(result.report);
            if (result.redTeamReport) setRedTeamReport(result.redTeamReport);
            if (result.competitors) setCompetitors(result.competitors);
            if (result.communityRecommendations) setCommunityRecommendations(result.communityRecommendations);
          }}
        />
      )}
    </div>
  );
}

export default App;
