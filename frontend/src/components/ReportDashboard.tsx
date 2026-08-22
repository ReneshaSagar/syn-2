import React, { useMemo, useState, useEffect } from 'react';
import type { Report, Persona, Simulation, RedTeamReport, Competitor, CommunityRecommendation, VersionSnapshot } from '../services/api';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, ArrowDown, CheckCircle2, MessageCircle, FileText, Wand2, Loader2, X, Users, ShieldAlert, Target, History, ChevronRight, Activity, TrendingUp, TrendingDown, BookOpen, MessageSquareQuote, ThumbsUp, AlertOctagon, Shield, HelpCircle, AlertTriangle, Crosshair, Building, MapPin, Settings2, ChevronUp, ChevronDown, Plus, Minus, ExternalLink, Swords, Flag } from 'lucide-react';
import { ChatDrawer } from './ChatDrawer';
import { generateAsset, pivotIdea, sendChatMessage, summarizeChat, generateDraft, saveDebate } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';

interface ReportDashboardProps {
  report: Report;
  analysis: any;
  personas: Persona[];
  simulations: Simulation[];
  redTeamReport?: RedTeamReport | null;
  competitors?: Competitor[];
  communityRecommendations?: CommunityRecommendation[];
  versionHistory?: VersionSnapshot[];
  onRestart: () => void;
  onPivotComplete: (result: any) => void;
  onGenerateRedTeam?: () => Promise<void>;
  onReanalyzeWithPriority?: (priority: string[]) => void;
}

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ 
  report, 
  analysis, 
  personas = [], 
  simulations = [], 
  redTeamReport,
  competitors = [],
  communityRecommendations = [],
  versionHistory = [],
  onRestart, 
  onPivotComplete,
  onGenerateRedTeam,
  onReanalyzeWithPriority
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'audience' | 'redteam' | 'competitors' | 'validation' | 'brainstorm' | 'versions' | 'simulate'>('overview');
  
  const [isGeneratingRedTeam, setIsGeneratingRedTeam] = useState(false);
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [segmentPriority, setSegmentPriority] = useState<string[]>([]);

  // Initialize segment priority from analysis if not set
  useEffect(() => {
    if (analysis?.audienceComposition && segmentPriority.length === 0) {
      setSegmentPriority(analysis.audienceComposition.map(s => s.name));
    }
  }, [analysis]);

  // Brainstorm Chat State
  const defaultBrainstormMessage = { role: 'assistant' as const, content: "Hello! I'm your Synthetic R&D Head. Let's discuss the simulation results and figure out how to pivot or improve your idea. What are you thinking?" };
  
  const [brainstormMessages, setBrainstormMessages] = useState<{role: 'user'|'assistant', content: string}[]>(
    report?.chatMemory?.['general'] || [defaultBrainstormMessage]
  );
  
  useEffect(() => {
    if (report?.chatMemory?.['general']) {
      setBrainstormMessages(report.chatMemory['general']);
    } else {
      setBrainstormMessages([defaultBrainstormMessage]);
    }
  }, [report?.ideaId, report?.chatMemory]);

  const [brainstormInput, setBrainstormInput] = useState('');
  const [isBrainstormLoading, setIsBrainstormLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleBrainstormSend = async () => {
    if (!brainstormInput.trim() || isBrainstormLoading) return;
    const userMsg = { role: 'user' as const, content: brainstormInput };
    const newMessages = [...brainstormMessages, userMsg];
    setBrainstormMessages(newMessages);
    setBrainstormInput('');
    setIsBrainstormLoading(true);
    try {
      const result = await sendChatMessage(report.ideaId, newMessages, { type: 'general' });
      setBrainstormMessages([...newMessages, { role: 'assistant', content: result.response }]);
    } catch (err) {
      setBrainstormMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered a network error.' }]);
    } finally {
      setIsBrainstormLoading(false);
    }
  };

  const handleSummarizeAndPivot = async () => {
    if (brainstormMessages.length <= 1) return;
    setIsSummarizing(true);
    try {
      const { pivotInstruction } = await summarizeChat(brainstormMessages);
      setPivotInstruction(pivotInstruction);
      setIsPivotModalOpen(true);
    } catch (err) {
      alert("Failed to summarize chat.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGenerateDraft = async (platform: string, community: string) => {
    setAssetTarget(`Launch post for ${platform} - ${community}`);
    setAssetMarkdown(null);
    setIsGeneratingAsset(true);
    try {
      const res = await generateDraft(report.ideaId, platform, community);
      setAssetMarkdown(res.draftMarkdown);
    } catch (err) {
      setAssetMarkdown("Sorry, an error occurred while generating the draft.");
    } finally {
      setIsGeneratingAsset(false);
    }
  };

  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [competitorFilter, setCompetitorFilter] = useState('All');
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null);

  // Asset Generation State
  const [assetTarget, setAssetTarget] = useState<string | null>(null);
  const [assetMarkdown, setAssetMarkdown] = useState<string | null>(null);
  const [isGeneratingAsset, setIsGeneratingAsset] = useState(false);

  const handleGenerateAsset = async (targetText: string) => {
    setAssetTarget(targetText);
    setAssetMarkdown(null);
    setIsGeneratingAsset(true);
    try {
      const res = await generateAsset(report.ideaId, targetText);
      setAssetMarkdown(res.assetMarkdown);
    } catch (err) {
      setAssetMarkdown("Sorry, an error occurred while generating the asset.");
    } finally {
      setIsGeneratingAsset(false);
    }
  };

  useEffect(() => {
    // Suppress unused warnings
    if (false) console.log(assetTarget, assetMarkdown, isGeneratingAsset, handleGenerateAsset);
  }, [assetTarget, assetMarkdown, isGeneratingAsset, handleGenerateAsset]);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<{ type: 'persona' | 'general'; targetId?: string; personaName?: string }>();
  const [initialChatMessage, setInitialChatMessage] = useState<string>('');
  const [chatDrawerMessages, setChatDrawerMessages] = useState<Record<string, { role: 'user'|'assistant', content: string }[]>>(report?.chatMemory || {});

  // Sync state if report changes (e.g. loading history)
  useEffect(() => {
    if (report?.chatMemory) {
      setChatDrawerMessages(report.chatMemory);
    }
  }, [report?.ideaId, report?.chatMemory]);

  // Floating Cursor State is disabled for now

  // Debate State
  const sortedSimulations = [...simulations].sort((a, b) => b.result.excitementScore - a.result.excitementScore);
  const defaultHighest = sortedSimulations[0]?.personaId;
  const defaultLowest = sortedSimulations[sortedSimulations.length - 1]?.personaId;

  const [debatePersona1Id, setDebatePersona1Id] = useState<string>(report?.debateMemory?.persona1Id || defaultHighest || '');
  const [debatePersona2Id, setDebatePersona2Id] = useState<string>(report?.debateMemory?.persona2Id || defaultLowest || '');
  const [debateTopic, setDebateTopic] = useState<string>(report?.debateMemory?.topic || 'the overall viability and potential of this idea');
  const [debateMessages, setDebateMessages] = useState<{senderId: string, content: string}[]>(report?.debateMemory?.messages || []);
  const [isDebateRunning, setIsDebateRunning] = useState(false);

  useEffect(() => {
    if (report?.debateMemory) {
      setDebatePersona1Id(report.debateMemory.persona1Id);
      setDebatePersona2Id(report.debateMemory.persona2Id);
      setDebateTopic(report.debateMemory.topic);
      setDebateMessages(report.debateMemory.messages);
    } else {
      setDebatePersona1Id(defaultHighest || '');
      setDebatePersona2Id(defaultLowest || '');
      setDebateTopic('the overall viability and potential of this idea');
      setDebateMessages([]);
    }
  }, [report?.ideaId, report?.debateMemory]);

  const [userDebateInput, setUserDebateInput] = useState('');
  const [userDebateSide, setUserDebateSide] = useState<'pro' | 'con'>('pro');

  const getMessagesForPersona = (targetPersonaId: string, opposingPersonaName: string) => {
    const msgs: { role: 'user' | 'assistant', content: string }[] = [];
    msgs.push({ role: 'user', content: `Let's begin the debate regarding: ${debateTopic}.` });
    
    for (const msg of debateMessages) {
      if (msg.senderId === targetPersonaId) {
        msgs.push({ role: 'assistant', content: msg.content });
      } else if (msg.senderId !== 'system' && msg.senderId !== 'conclusion') {
        const isUser = msg.senderId.startsWith('user-');
        const senderName = isUser ? `The Founder (acting as ${msg.senderId === 'user-pro' ? 'Pro' : 'Con'})` : opposingPersonaName;
        msgs.push({ role: 'user', content: `${senderName} said:\n\n"${msg.content}"\n\nProvide your rebuttal.` });
      }
    }
    return msgs;
  };

  const handleStartDebate = async () => {
    if (!debatePersona1Id || !debatePersona2Id || isDebateRunning) return;
    setIsDebateRunning(true);
    setDebateMessages([]); // Clear previous
    setDebateConclusion(null);
    const persona1 = personas.find(p => p.id === debatePersona1Id);
    if (!persona1) { setIsDebateRunning(false); return; }

    try {
      // Turn 1
      const msg1 = [{ role: 'user' as const, content: `Let's begin the debate regarding: ${debateTopic}. Give your opening statement and initial thoughts. Do not wait for me.` }];
      const res1 = await sendChatMessage(report.ideaId, msg1, { type: 'debate', targetId: debatePersona1Id, topic: debateTopic });
      const currentMessages = [{ senderId: debatePersona1Id, content: res1.response }];
      setDebateMessages([...currentMessages]);

      // Turn 2
      const msg2 = [
        { role: 'user' as const, content: `Let's begin the debate regarding: ${debateTopic}. Here is ${persona1.name}'s opening statement:\n\n"${res1.response}"\n\nProvide your rebuttal.` }
      ];
      const res2 = await sendChatMessage(report.ideaId, msg2, { type: 'debate', targetId: debatePersona2Id, topic: debateTopic });
      currentMessages.push({ senderId: debatePersona2Id, content: res2.response });
      setDebateMessages([...currentMessages]);

      await saveDebate(report.ideaId, {
        persona1Id: debatePersona1Id,
        persona2Id: debatePersona2Id,
        topic: debateTopic,
        messages: currentMessages,
        conclusion: undefined
      });
    } catch (err) {
      setDebateMessages(prev => [...prev, { senderId: 'system', content: 'Debate encountered an error.' }]);
    } finally {
      setIsDebateRunning(false);
    }
  };

  const handleNextTurn = async () => {
    if (!debatePersona1Id || !debatePersona2Id || isDebateRunning || debateMessages.length === 0) return;
    setIsDebateRunning(true);

    // Determine whose turn it is
    const lastSender = debateMessages[debateMessages.length - 1].senderId;
    let nextPersonaId = debatePersona2Id;
    let opposingName = personas.find(p => p.id === debatePersona1Id)?.name || 'Opponent';
    
    // If the last sender was Persona 2, or User Con, then Persona 1 (Pro) should reply.
    if (lastSender === debatePersona2Id || lastSender === 'user-con') {
      nextPersonaId = debatePersona1Id;
      opposingName = personas.find(p => p.id === debatePersona2Id)?.name || 'Opponent';
    }

    try {
      const msgs = getMessagesForPersona(nextPersonaId, opposingName);
      const res = await sendChatMessage(report.ideaId, msgs, { type: 'debate', targetId: nextPersonaId, topic: debateTopic });
      
      const newMessages = [...debateMessages, { senderId: nextPersonaId, content: res.response }];
      setDebateMessages(newMessages);

      await saveDebate(report.ideaId, {
        persona1Id: debatePersona1Id,
        persona2Id: debatePersona2Id,
        topic: debateTopic,
        messages: newMessages,
        conclusion: debateConclusion || undefined
      });
    } catch (err) {
      setDebateMessages(prev => [...prev, { senderId: 'system', content: 'Debate encountered an error.' }]);
    } finally {
      setIsDebateRunning(false);
    }
  };

  const handleUserInterject = async () => {
    if (!userDebateInput.trim() || isDebateRunning) return;
    const sender = `user-${userDebateSide}`;
    const newMessages = [...debateMessages, { senderId: sender, content: userDebateInput.trim() }];
    setDebateMessages(newMessages);
    setUserDebateInput('');
    
    await saveDebate(report.ideaId, {
      persona1Id: debatePersona1Id,
      persona2Id: debatePersona2Id,
      topic: debateTopic,
      messages: newMessages,
      conclusion: debateConclusion || undefined
    });
  };

  const handleEndDebate = async () => {
    if (isDebateRunning || debateMessages.length === 0) return;
    setIsDebateRunning(true);
    try {
      const msgs = debateMessages.map(m => ({
        role: 'user' as const,
        content: `[${m.senderId}]: ${m.content}`
      }));
      const res = await sendChatMessage(report.ideaId, msgs, { type: 'debate-conclusion' });
      setDebateConclusion(res.response);
      
      await saveDebate(report.ideaId, {
        persona1Id: debatePersona1Id,
        persona2Id: debatePersona2Id,
        topic: debateTopic,
        messages: debateMessages,
        conclusion: res.response
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsDebateRunning(false);
    }
  };

  const openChat = (type: 'persona' | 'general', targetId?: string, personaName?: string, message?: string) => {
    setChatContext({ type, targetId, personaName });
    if (message) {
       setInitialChatMessage(`Sure! I'll help you explore: "${message}". What specifically would you like to know?`);
    } else {
       setInitialChatMessage('');
    }
    setIsChatOpen(true);
  };

  // Asset Generation State
  const [isPivotModalOpen, setIsPivotModalOpen] = useState(false);
  const [pivotInstruction, setPivotInstruction] = useState('');
  const [isPivoting, setIsPivoting] = useState(false);

  const handlePivot = async () => {
    if (!pivotInstruction.trim() || !onPivotComplete) return;
    setIsPivoting(true);
    try {
      const result = await pivotIdea(report.ideaId, pivotInstruction);
      setIsPivotModalOpen(false);
      onPivotComplete(result);
    } catch (err) {
      alert("Failed to pivot idea.");
    } finally {
      setIsPivoting(false);
    }
  };

  const handleDownloadPDF = async () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;
    
    const reportContent = document.getElementById('hidden-report-content');
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    printWindow.document.write('<html><head><title>Synthetic R&D Report</title>');
    printWindow.document.write(`
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { 
          font-family: 'Inter', system-ui, -apple-system, sans-serif; 
          line-height: 1.7; 
          color: #1f2937; 
          max-width: 900px; 
          margin: 0 auto; 
          padding: 40px; 
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        /* Print-specific rules to prevent abrupt cuts */
        @media print {
          @page { margin: 20mm; }
          body { padding: 0 !important; }
          h1, h2, h3, h4, h5, h6 { page-break-after: avoid; break-after: avoid; }
          img { page-break-inside: avoid; break-inside: avoid; max-width: 100% !important; }
          p, ul, ol, li, pre, blockquote, table, tr, td { page-break-inside: avoid; break-inside: avoid; }
        }

        .print-header {
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 24px;
          margin-bottom: 40px;
        }
        .print-header h1 {
          margin: 0;
          font-size: 28px;
          color: #111827;
          font-weight: 700;
          letter-spacing: -0.025em;
        }
        .print-header p {
          color: #6b7280;
          margin: 8px 0 0 0;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 500;
        }

        /* Typography */
        h1, h2, h3 { color: #111827; margin-top: 2em; margin-bottom: 1em; font-weight: 600; letter-spacing: -0.025em; }
        h1 { font-size: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; }
        h2 { font-size: 20px; }
        h3 { font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; }
        
        p { margin-bottom: 1.5em; }
        strong { color: #111827; font-weight: 600; }
        
        /* Lists */
        ul, ol { padding-left: 24px; margin-bottom: 1.5em; }
        li { margin-bottom: 0.5em; }
        li > p { margin-bottom: 0.5em; }
        
        /* Blocks */
        pre { 
          background: #f3f4f6; 
          padding: 20px; 
          border-radius: 8px; 
          border: 1px solid #e5e7eb; 
          white-space: pre-wrap; 
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 14px;
          overflow-x: auto;
        }
        blockquote { 
          border-left: 4px solid #6366f1; 
          margin: 1.5em 0; 
          padding: 16px 20px; 
          color: #4b5563; 
          font-style: italic; 
          background: #f9fafb; 
          border-radius: 0 8px 8px 0; 
        }
        
        /* Tables */
        table { width: 100%; border-collapse: collapse; margin: 2em 0; font-size: 14px; }
        th { background-color: #f9fafb; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; padding: 12px 16px; text-align: left; }
        td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; color: #4b5563; }
        tr:nth-child(even) td { background-color: #f9fafb; }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write(`
      <div class="print-header">
        <h1>Synthetic Audience Analysis</h1>
        <p>Generated on ${dateStr}</p>
      </div>
    `);
    printWindow.document.write('<div class="report-content">');
    const htmlContent = report.fullReportMarkdown ? marked.parse(report.fullReportMarkdown) : 'Report content missing';
    printWindow.document.write(typeof htmlContent === 'string' ? htmlContent : await htmlContent);
    printWindow.document.write('</div>');
    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
  };

  let interestScore = report.insights?.overallInterestScore || 0;
  if (interestScore > 0 && interestScore <= 10) {
    interestScore *= 10;
  }

  const scoreData = [
    { name: 'Interest', value: interestScore },
    { name: 'Remaining', value: 100 - interestScore }
  ];
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e'];

  const hypeUtilityStats = useMemo(() => {
    if (!report?.insights?.segmentBreakdown?.length) return { hype: 50, utility: 50, rawHype: 0, rawUtility: 0 };
    
    let totalExcitement = 0;
    let totalInterest = 0;
    report.insights.segmentBreakdown.forEach(s => {
      totalExcitement += (s.avgExcitement || 0);
      totalInterest += (s.avgInterest || 0);
    });
    
    const segments = report.insights.segmentBreakdown.length;
    const avgEx = (totalExcitement / segments) * 10;
    const avgIn = (totalInterest / segments) * 10;
    
    const total = avgEx + avgIn;
    if (total === 0) return { hype: 50, utility: 50, rawHype: 0, rawUtility: 0 };
    
    return {
      hype: Math.round((avgEx / total) * 100),
      utility: Math.round((avgIn / total) * 100),
      rawHype: Math.round(avgEx),
      rawUtility: Math.round(avgIn)
    };
  }, [report]);

  const getRiskColor = (level?: string) => {
    switch(level?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  const getBadgeStyle = (type: 'SIMULATED' | 'RESEARCHED' | 'ANALYZED') => {
    switch (type) {
      case 'SIMULATED': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'RESEARCHED': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'ANALYZED': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    }
  };

  const Badge = ({ type }: { type: 'SIMULATED' | 'RESEARCHED' | 'ANALYZED' }) => (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider border ${getBadgeStyle(type)} flex items-center gap-1 w-fit`}>
      {type === 'SIMULATED' && <Activity className="w-3 h-3" />}
      {type === 'RESEARCHED' && <BookOpen className="w-3 h-3" />}
      {type === 'ANALYZED' && <Target className="w-3 h-3" />}
      {type}
    </span>
  );

  const personasBySegment = useMemo(() => {
    const grouped: Record<string, typeof personas> = {};
    personas.forEach(p => {
      const segment = p.segment || 'Other';
      if (!grouped[segment]) grouped[segment] = [];
      grouped[segment].push(p);
    });
    return grouped;
  }, [personas]);

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-gray-100 selection:bg-blue-100 dark:selection:bg-blue-900/50 selection:text-blue-900 dark:selection:text-blue-100 font-['Outfit'] transition-colors duration-500 pb-32">
      <div className="max-w-7xl mx-auto space-y-10 pt-8">


        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-green-100 dark:border-green-900/50 transition-colors duration-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Analysis Complete
            </div>
            
            <h1 className="text-5xl font-semibold tracking-tight text-gray-900 dark:text-white transition-colors duration-500">
              Simulation Insights
            </h1>
            
            <p className="text-xl text-gray-500 dark:text-gray-400 font-light transition-colors duration-500">
              Market reaction based on <span className="font-medium text-gray-800 dark:text-gray-200">{analysis?.industry || 'target'}</span> synthetic segment.
            </p>
            
            {/* R&D Settings Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center mr-1">R&D Settings:</span>
              <span className="px-2.5 py-1 bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium border border-gray-200 dark:border-[#333]">
                {analysis?.config?.lens ? `Lens: ${Array.isArray(analysis.config.lens) ? analysis.config.lens.map(l => l.replace('_', ' ').toUpperCase()).join(' & ') : (analysis.config.lens as string).replace('_', ' ').toUpperCase()}` : 'Lens: MARKET FIT'}
              </span>
              <span className="px-2.5 py-1 bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium border border-gray-200 dark:border-[#333]">
                {analysis?.config?.depth ? `Depth: ${analysis.config.depth.toUpperCase()}` : 'Depth: STANDARD'}
              </span>
              <span className="px-2.5 py-1 bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium border border-gray-200 dark:border-[#333]">
                {analysis?.config?.region ? `Region: ${analysis.config.region.replace('_', ' ').toUpperCase()}` : 'Region: GLOBAL'}
              </span>
              {analysis?.config?.customPersona && (
                <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium border border-blue-200 dark:border-blue-800/50">
                  Custom: {analysis.config.customPersona}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-4 items-center">
             <button 
                onClick={() => setIsPivotModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-6 py-3 rounded-full shadow-md font-medium text-sm transition-all transform hover:scale-105"
              >
                <Wand2 className="w-4 h-4" /> Pivot Idea
              </button>
              <button 
                onClick={onRestart}
                className="px-8 py-3 bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-[#222] text-gray-900 dark:text-white border border-gray-200 dark:border-[#333] shadow-sm hover:shadow-md transition-all duration-300 rounded-full text-base font-medium flex items-center justify-center gap-2"
              >
                New <ArrowRight className="w-4 h-4" />
              </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto hide-scrollbar bg-white dark:bg-[#111] p-1.5 rounded-full border border-gray-200 dark:border-[#333] shadow-sm">
          {[
            { id: 'overview', label: 'R&D Summary', icon: Activity },
            { id: 'audience', label: 'Synthetic Focus Group', icon: Users },
            { id: 'redteam', label: 'Red Team', icon: ShieldAlert },
            { id: 'competitors', label: 'Competitors', icon: Target },
            { id: 'debate', label: 'Debate', icon: Swords, isRed: true },
            { id: 'validate', label: 'Where to Validate', icon: ChevronRight },
            { id: 'brainstorm', label: 'Lead Researcher', icon: MessageCircle },
            { id: 'versions', label: 'History', icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isRed = (tab as any).isRed;
            
            let buttonClasses = 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300';
            if (isActive) {
              buttonClasses = isRed 
                ? 'bg-red-500 text-white shadow-md' 
                : 'bg-gray-900 text-white dark:bg-[#222] dark:text-white shadow-md';
            } else if (isRed) {
              buttonClasses = 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10';
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap ${buttonClasses}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Interest Score */}
              <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] shadow-sm rounded-[2rem] p-8 flex flex-col items-center justify-center relative">
                <div className="absolute top-6 left-6"><Badge type="ANALYZED" /></div>
                <h3 className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-widest font-semibold mb-4 text-center mt-6">Interest Score</h3>
                <div className="w-40 h-40 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={scoreData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                          {scoreData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-semibold text-gray-900 dark:text-white">{interestScore}%</span>
                  </div>
                </div>
              </div>

              {/* Biggest Opportunity */}
              <div className="bg-white dark:bg-[#0a0a0a] border border-emerald-100 dark:border-emerald-900/50 shadow-sm rounded-[2rem] p-8 flex flex-col relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/10 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
                 <div className="absolute top-6 right-6"><Badge type="ANALYZED" /></div>
                 <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                    <TrendingUp className="w-6 h-6" />
                 </div>
                 <h3 className="text-emerald-600 dark:text-emerald-400 text-sm uppercase tracking-widest font-semibold mb-2">Biggest Opportunity</h3>
                 <p className="text-xl font-medium text-gray-900 dark:text-white leading-tight">
                   {report.insights?.mostInterestedSegment || 'General Market'}
                 </p>
                 <p className="text-gray-500 dark:text-gray-400 mt-4 text-sm">Key segment showing the highest willingness to adopt.</p>
              </div>

              {/* Biggest Risk */}
              <div className="bg-white dark:bg-[#0a0a0a] border border-rose-100 dark:border-rose-900/50 shadow-sm rounded-[2rem] p-8 flex flex-col relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 dark:bg-rose-900/10 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
                 <div className="absolute top-6 right-6"><Badge type="ANALYZED" /></div>
                 <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-6">
                    <TrendingDown className="w-6 h-6" />
                 </div>
                 <h3 className="text-rose-600 dark:text-rose-400 text-sm uppercase tracking-widest font-semibold mb-2">Biggest Risk</h3>
                 <p className="text-xl font-medium text-gray-900 dark:text-white leading-tight line-clamp-3">
                   {report.insights?.topConcerns?.[0] || 'Pricing Resistance'}
                 </p>
                 <p className="text-gray-500 dark:text-gray-400 mt-4 text-sm">Primary friction point for adoption.</p>
              </div>
            </div>

            {/* Segment Breakdown */}
            {report.insights?.segmentBreakdown && report.insights.segmentBreakdown.length > 0 && (
              <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] shadow-sm rounded-[2.5rem] p-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Segment Breakdown</h3>
                  <Badge type="ANALYZED" />
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.insights.segmentBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
                      <XAxis type="number" domain={[0, 10]} stroke="#888" />
                      <YAxis dataKey="segmentName" type="category" width={150} stroke="#888" />
                      <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff'}} formatter={(value: any) => [typeof value === 'number' ? value.toFixed(1) + ' / 10' : value, 'Average Interest']} />
                      <Bar dataKey="avgInterest" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}





            {/* Actionable Roadmap */}
            {report.insights?.actionableRoadmap && report.insights.actionableRoadmap.length > 0 && (() => {
              const roadmap = report.insights.actionableRoadmap;
              const chunkSize = 3;
              const rows = [];
              for (let i = 0; i < roadmap.length; i += chunkSize) {
                rows.push(roadmap.slice(i, i + chunkSize).map((step, idx) => ({ step, originalIndex: i + idx })));
              }

              return (
                <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] shadow-sm rounded-[2.5rem] p-10">
                  <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl text-amber-500 dark:text-amber-400">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Actionable Roadmap</h3>
                    </div>
                    <Badge type="ANALYZED" />
                  </div>
                  
                  <div className="flex flex-col items-center w-full gap-8">
                    {rows?.map((row, rowIndex) => {
                      const isEven = rowIndex % 2 === 0;
                      const isLastRow = rowIndex === rows.length - 1;
                      
                      return (
                        <React.Fragment key={rowIndex}>
                          <div className={`flex w-full items-stretch justify-center gap-8 ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                            {row?.map((item, colIndex) => {
                              const isLastInRow = colIndex === row.length - 1;
                              const isLastOverall = item.originalIndex === roadmap.length - 1;
                              
                              return (
                                <React.Fragment key={item.originalIndex}>
                                  <div className="flex-1 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] shadow-sm p-6 rounded-[2rem] relative overflow-hidden group min-h-[140px]">
                                    <span className="text-4xl font-black text-gray-200 dark:text-[#222] absolute top-4 right-4 z-0 pointer-events-none">{item.originalIndex + 1}</span>
                                    <p className="text-gray-800 dark:text-gray-200 font-medium relative z-10">{item.step}</p>
                                  </div>
                                  {!isLastInRow && !isLastOverall && (
                                    <div className="flex items-center justify-center">
                                      {isEven ? <ArrowRight className="w-6 h-6 text-amber-500" /> : <ArrowLeft className="w-6 h-6 text-amber-500" />}
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                            {Array.from({ length: 3 - row.length }).map((_, i) => (
                               <React.Fragment key={`empty-${i}`}>
                                 <div className="w-6 h-6 opacity-0" />
                                 <div className="flex-1 opacity-0" />
                               </React.Fragment>
                            ))}
                          </div>
                          {!isLastRow && (
                             <div className="flex w-full gap-8">
                               {isEven ? (
                                  <>
                                    <div className="flex-1" />
                                    <div className="w-6 h-6" />
                                    <div className="flex-1" />
                                    <div className="w-6 h-6" />
                                    <div className="flex-1 flex justify-center"><ArrowDown className="w-6 h-6 text-amber-500" /></div>
                                  </>
                               ) : (
                                  <>
                                    <div className="flex-1 flex justify-center"><ArrowDown className="w-6 h-6 text-amber-500" /></div>
                                    <div className="w-6 h-6" />
                                    <div className="flex-1" />
                                    <div className="w-6 h-6" />
                                    <div className="flex-1" />
                                  </>
                               )}
                             </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-center mt-12 pb-12">
              <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black px-8 py-4 rounded-full shadow-lg font-semibold transition-all">
                <ArrowDown className="w-5 h-5" /> Download Report as PDF
              </button>
            </div>
          </motion.div>
        )}

        {/* TAB 2: AUDIENCE (Persona Explorer) */}
        {activeTab === 'audience' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            
            <div className="flex justify-between items-center bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] p-6 rounded-[2rem] shadow-sm">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Audience Segments</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Explore the personas generated for each segment of your market.
                </p>
              </div>
              <button 
                onClick={() => setIsPriorityModalOpen(true)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1a1a] dark:hover:bg-[#222] text-gray-900 dark:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <Settings2 className="w-4 h-4" /> Adjust Priority Ranking
              </button>
            </div>

            {isPriorityModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] rounded-[2rem] p-8 max-w-lg w-full shadow-2xl relative">
                  <button onClick={() => setIsPriorityModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white"><X className="w-5 h-5"/></button>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Segment Priority Ranking</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Rank your audience segments from highest to lowest priority. The AI will bias the simulation and generate more personas for higher-ranked segments.
                  </p>
                  
                  <div className="space-y-3 mb-8">
                    {segmentPriority.map((segment, index) => (
                      <div key={segment} className="flex items-center gap-3 bg-gray-50 dark:bg-[#111] p-3 rounded-xl border border-gray-200 dark:border-[#333]">
                        <span className="font-bold text-gray-400 w-6">{index + 1}.</span>
                        <span className="flex-1 font-semibold text-gray-900 dark:text-white truncate">{segment}</span>
                        <div className="flex flex-col gap-1">
                          <button 
                            disabled={index === 0}
                            onClick={() => {
                              const newP = [...segmentPriority];
                              [newP[index - 1], newP[index]] = [newP[index], newP[index - 1]];
                              setSegmentPriority(newP);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button 
                            disabled={index === segmentPriority.length - 1}
                            onClick={() => {
                              const newP = [...segmentPriority];
                              [newP[index + 1], newP[index]] = [newP[index], newP[index + 1]];
                              setSegmentPriority(newP);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setIsPriorityModalOpen(false)} className="flex-1 py-3 font-semibold rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1a1a] dark:text-gray-300 dark:hover:bg-[#222]">Cancel</button>
                    <button 
                      onClick={() => {
                        setIsPriorityModalOpen(false);
                        onReanalyzeWithPriority?.(segmentPriority);
                      }}
                      className="flex-1 py-3 font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                    >
                      Re-analyze Idea
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {Object.entries(personasBySegment).map(([segment, segmentPersonas]) => (
              <div key={segment} className="space-y-6">
                <div className="flex items-center gap-4 border-b border-gray-200 dark:border-[#333] pb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{segment}</h2>
                  <span className="bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-semibold">{segmentPersonas.length} Personas</span>
                  <div className="ml-auto"><Badge type="SIMULATED" /></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {segmentPersonas?.map((persona) => {
                    const sim = simulations.find(s => s?.personaId === persona?.id);
                    const isSelected = selectedPersonaId === persona?.id;
                    const hue = ((persona.name || '').length * 40) % 360;
                    
                    return (
                      <div key={persona.id} className={`flex flex-col gap-4 transition-all duration-500 ${isSelected ? 'md:col-span-2' : ''}`}>
                        <div 
                          onClick={() => setSelectedPersonaId(isSelected ? null : persona.id)}
                          className={`cursor-pointer bg-white dark:bg-[#0a0a0a] border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-100 dark:border-[#222]'} shadow-sm hover:shadow-md rounded-[2rem] p-6 relative overflow-hidden`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0" style={{ backgroundColor: `hsl(${hue}, 70%, 90%)`, color: `hsl(${hue}, 60%, 30%)` }}>
                              {(persona.name || 'U').charAt(0)}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-gray-900 dark:text-white">{persona.name}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{persona.role} • {persona.age} yrs</p>
                              
                              {sim?.result?.excitementScore !== undefined && (
                                <div className="mt-3 flex gap-2">
                                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${sim.result.excitementScore >= 7 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : sim.result.excitementScore >= 4 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                    Interest: {sim.result.excitementScore}/10
                                  </span>
                                  {persona.adoptionTendency && (
                                    <span className="text-xs px-2 py-1 rounded-full font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                      {persona.adoptionTendency}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {!isSelected && persona.personalityTraits && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {persona.personalityTraits?.slice(0, 3).map((t: string, i: number) => (
                                <span key={i} className="text-xs bg-gray-100 dark:bg-[#111] text-gray-600 dark:text-gray-400 px-2 py-1 rounded border border-gray-200 dark:border-[#333]">{t}</span>
                              ))}
                              {persona.personalityTraits.length > 3 && <span className="text-xs text-gray-400 px-1 py-1">+{persona.personalityTraits.length - 3} more</span>}
                            </div>
                          )}

                          <AnimatePresence>
                            {isSelected && sim && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-6 pt-6 border-t border-gray-100 dark:border-[#222] overflow-hidden">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-6">
                                    <div>
                                      <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2"><MessageSquareQuote className="w-4 h-4 text-blue-500"/> First Reaction</h5>
                                      <p className="text-gray-700 dark:text-gray-300 italic bg-gray-50 dark:bg-[#111] p-4 rounded-xl border border-gray-100 dark:border-[#222]">"{sim.result?.reaction}"</p>
                                    </div>
                                    <div>
                                      <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2"><ThumbsUp className="w-4 h-4 text-emerald-500"/> Main Attraction</h5>
                                      <p className="text-gray-700 dark:text-gray-300">{sim.result?.mainAttraction || 'None'}</p>
                                    </div>
                                    <div>
                                      <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2"><AlertOctagon className="w-4 h-4 text-rose-500"/> Main Concern</h5>
                                      <p className="text-gray-700 dark:text-gray-300">{sim.result?.mainConcern || 'None'}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-6">
                                    {sim.result?.objections && sim.result.objections.length > 0 && (
                                      <div>
                                        <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Key Objections</h5>
                                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1 text-sm">
                                          {sim?.result?.objections?.map((o, i) => <li key={i}>{o}</li>)}
                                        </ul>
                                      </div>
                                    )}
                                    {sim.result?.questions && sim.result.questions.length > 0 && (
                                      <div>
                                        <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Questions They Have</h5>
                                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1 text-sm">
                                          {sim?.result?.questions?.map((q, i) => <li key={i}>{q}</li>)}
                                        </ul>
                                      </div>
                                    )}
                                    {sim.result?.whatWouldChangeTheirMind && (
                                      <div>
                                        <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2"><Wand2 className="w-4 h-4 text-purple-500"/> What Would Change Their Mind?</h5>
                                        <p className="text-gray-700 dark:text-gray-300 text-sm">{sim.result.whatWouldChangeTheirMind}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mt-8 flex justify-end border-t border-gray-100 dark:border-[#222] pt-6">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); openChat('persona', persona.id, persona.name); }} 
                                    className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm transition-colors"
                                  >
                                    <MessageCircle className="w-4 h-4" /> Talk to {persona.name}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* TAB 3: RED TEAM */}
        {activeTab === 'redteam' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {!redTeamReport ? (
              <div className="bg-white dark:bg-[#0a0a0a] border border-red-100 dark:border-red-900/30 rounded-[2rem] p-12 text-center max-w-3xl mx-auto shadow-sm">
                <ShieldAlert className="w-20 h-20 mx-auto text-red-500 mb-6" />
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Adversarial R&D Unit</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 leading-relaxed">
                  The Red Team is your adversarial R&D unit. They will aggressively attack your business model, highlight regulatory risks, expose hidden assumptions, and find the fatal flaws <b>before</b> you launch.
                </p>
                <button
                  onClick={async () => {
                    if (!onGenerateRedTeam) return;
                    setIsGeneratingRedTeam(true);
                    try {
                      await onGenerateRedTeam();
                    } catch(err) {
                      alert('Failed to generate red team analysis.');
                    } finally {
                      setIsGeneratingRedTeam(false);
                    }
                  }}
                  disabled={isGeneratingRedTeam}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white px-8 py-4 rounded-full font-bold text-lg transition-colors inline-flex items-center gap-2"
                >
                  {isGeneratingRedTeam ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Analyzing Risks...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" /> Generate Red Team Report
                    </>
                  )}
                </button>
              </div>
            ) : (
              <>
                <div className={`border rounded-[2.5rem] p-8 md:p-12 ${getRiskColor(redTeamReport.overallRiskLevel)} shadow-sm relative overflow-hidden`}>
                  <div className="absolute top-6 right-6"><Badge type="ANALYZED" /></div>
                  <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="bg-white/50 dark:bg-black/20 p-6 rounded-3xl shrink-0 backdrop-blur-sm">
                      <Shield className="w-16 h-16" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold uppercase tracking-widest mb-2 opacity-80">Overall Risk Level</h2>
                      <p className="text-4xl md:text-5xl font-black mb-4 capitalize">{redTeamReport.overallRiskLevel}</p>
                      <p className="text-lg font-medium opacity-90 leading-relaxed max-w-3xl">{redTeamReport.summary}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Assumptions */}
                  <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] rounded-[2rem] p-8 shadow-sm">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                      <HelpCircle className="w-6 h-6 text-purple-500" /> Hidden Assumptions
                    </h3>
                    <div className="space-y-4">
                      {redTeamReport?.hiddenAssumptions?.map((assump: any, i: number) => (
                        <div key={i} className="p-4 bg-gray-50 dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-[#333]">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{assump.assumption}</h4>
                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${getRiskColor(assump.severity)}`}>{assump.severity}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{assump.evidence}</p>
                          <div className="text-sm bg-purple-50 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 p-3 rounded-xl">
                            <strong>Fix:</strong> {assump.recommendation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Barriers & Flaws */}
                  <div className="space-y-8">
                    <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] rounded-[2rem] p-8 shadow-sm">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                        <AlertOctagon className="w-5 h-5 text-rose-500" /> Adoption Barriers
                      </h3>
                      <ul className="space-y-3">
                        {redTeamReport?.adoptionBarriers?.map((b: string, i: number) => (
                          <li key={i} className="flex gap-3 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#111] p-3 rounded-xl">
                            <span className="text-rose-500 font-bold">•</span> {b}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] rounded-[2rem] p-8 shadow-sm">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                        <ShieldAlert className="w-5 h-5 text-amber-500" /> Contradictions
                      </h3>
                      <ul className="space-y-3">
                        {redTeamReport?.contradictionsBetweenPersonas?.map((c: string, i: number) => (
                          <li key={i} className="flex gap-3 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#111] p-3 rounded-xl">
                            <span className="text-amber-500 font-bold">•</span> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* TAB 4: COMPETITORS */}
        {activeTab === 'competitors' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
             {!competitors || competitors.length === 0 ? (
                <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] rounded-[2rem] p-12 text-center">
                  <Crosshair className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Competitive Landscape Not Available</h3>
                  <p className="text-gray-500 mt-2">Run competitor analysis to populate this section.</p>
                </div>
             ) : (
               <>
                 <div className="flex flex-wrap gap-2 items-center">
                   <span className="text-sm font-semibold text-gray-500 mr-2">Filter:</span>
                   {['All', 'Direct', 'Indirect', 'Alternative', 'Adjacent'].map(cat => (
                     <button
                       key={cat}
                       onClick={() => setCompetitorFilter(cat)}
                       className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${competitorFilter === cat ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-white text-gray-600 dark:bg-[#111] dark:text-gray-300 border border-gray-200 dark:border-[#333]'}`}
                     >
                       {cat}
                     </button>
                   ))}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {(competitors || []).filter(c => competitorFilter === 'All' || c.category === competitorFilter).map((comp, idx) => (
                     <div key={idx} className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] rounded-[2rem] p-6 shadow-sm flex flex-col relative overflow-hidden">
                       <div className="absolute top-6 right-6 flex gap-2">
                         <Badge type={comp.source === 'researched' ? 'RESEARCHED' : 'ANALYZED'} />
                       </div>
                       
                       <div className="flex items-center gap-4 mb-4">
                         <div className="w-12 h-12 bg-gray-100 dark:bg-[#222] rounded-xl flex items-center justify-center">
                           <Building className="w-6 h-6 text-gray-500" />
                         </div>
                         <div>
                           <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                             {comp.name}
                             {comp.url && (
                               <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                                 <ExternalLink className="w-4 h-4" />
                               </a>
                             )}
                           </h3>
                           <div className="flex gap-2 mt-1">
                             <span className="text-xs bg-gray-100 dark:bg-[#111] text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded uppercase font-semibold">{comp.category}</span>
                             <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${getRiskColor(comp.threatLevel)}`}>{comp.threatLevel} Threat</span>
                           </div>
                         </div>
                       </div>
                       
                       <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{comp.description}</p>
                       
                       <button 
                         onClick={() => setExpandedCompetitor(expandedCompetitor === comp.name ? null : comp.name)}
                         className="mt-auto text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                       >
                         {expandedCompetitor === comp.name ? 'Show Less' : 'View Details'} <ArrowDown className={`w-4 h-4 transition-transform ${expandedCompetitor === comp.name ? 'rotate-180' : ''}`} />
                       </button>

                       <AnimatePresence>
                         {expandedCompetitor === comp.name && (
                           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 pt-4 border-t border-gray-100 dark:border-[#222] text-sm overflow-hidden space-y-4">
                             <div>
                               <strong className="text-gray-900 dark:text-white">Target Audience:</strong> <span className="text-gray-600 dark:text-gray-400">{comp.targetAudience}</span>
                             </div>
                             <div>
                               <strong className="text-gray-900 dark:text-white">Key Features:</strong>
                               <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mt-1">
                                 {comp.keyFeatures?.map((f, i) => <li key={i}>{f}</li>)}
                               </ul>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                               <div>
                                 <strong className="text-green-600 dark:text-green-400 flex items-center gap-1"><ThumbsUp className="w-3 h-3"/> Strengths</strong>
                                 <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mt-1">
                                   {comp.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                                 </ul>
                               </div>
                               <div>
                                 <strong className="text-red-600 dark:text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Weaknesses</strong>
                                 <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mt-1">
                                   {comp.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                                 </ul>
                               </div>
                             </div>
                             <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                               <strong className="text-blue-800 dark:text-blue-300">How we are different:</strong>
                               <p className="text-blue-600 dark:text-blue-400 mt-1">{comp.differenceFromOurIdea}</p>
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
                   ))}
                 </div>
               </>
             )}
          </motion.div>
        )}

        {/* TAB 5: WHERE TO VALIDATE */}
        {activeTab === 'validate' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {!communityRecommendations || communityRecommendations.length === 0 ? (
              <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] rounded-[2rem] p-12 text-center">
                <MapPin className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Validation Channels Not Available</h3>
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] rounded-[2rem] p-8 shadow-sm">
                   <div className="flex justify-between items-center mb-6">
                     <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Top Validation Channels</h3>
                     <Badge type="RESEARCHED" />
                   </div>
                   <div className="space-y-4">
                     {[...(communityRecommendations || [])].sort((a,b) => b.relevanceScore - a.relevanceScore).map((rec, idx) => (
                       <div key={idx} className={`p-6 rounded-2xl border ${idx === 0 ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 shadow-md ring-1 ring-blue-500/20' : 'border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#111]'} flex flex-col md:flex-row gap-6 items-center`}>
                         <div className="shrink-0 w-16 h-16 bg-white dark:bg-[#222] rounded-2xl flex items-center justify-center border border-gray-100 dark:border-[#333] shadow-sm font-bold text-xl text-blue-600">
                           {rec.platform.charAt(0)}
                         </div>
                         <div className="flex-1 w-full">
                           <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                             <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                               {rec.url ? (
                                 <a href={rec.url.startsWith('http') ? rec.url : `https://${rec.url}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                   {rec.community}
                                   <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                 </a>
                               ) : (
                                 rec.community
                               )}
                               <span className="text-xs font-normal text-gray-500 bg-gray-200 dark:bg-[#333] px-2 py-0.5 rounded">{rec.platform}</span>
                             </h4>
                             <div className="flex items-center gap-2">
                               <span className="text-xs font-bold text-gray-500 uppercase">Match Score</span>
                               <div className="w-24 h-2 bg-gray-200 dark:bg-[#333] rounded-full overflow-hidden">
                                 <div className="h-full bg-blue-500" style={{ width: `${rec.relevanceScore}%` }} />
                               </div>
                               <span className="text-sm font-bold text-gray-900 dark:text-white">{rec.relevanceScore}%</span>
                             </div>
                           </div>
                           <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{rec.reason}</p>
                           <div className="flex flex-wrap gap-2 mt-2 mb-4">
                              <span className="text-xs bg-white dark:bg-[#222] border border-gray-200 dark:border-[#444] px-3 py-1 rounded-full text-gray-600 dark:text-gray-300">👥 {rec.audienceType}</span>
                              <span className="text-xs bg-white dark:bg-[#222] border border-gray-200 dark:border-[#444] px-3 py-1 rounded-full text-gray-600 dark:text-gray-300">💬 {rec.feedbackType} expected</span>
                            </div>
                            <div className="pt-4 border-t border-gray-100 dark:border-[#333]">
                              <button 
                                onClick={() => handleGenerateDraft(rec.platform, rec.community)}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2 transition-colors"
                              >
                                <Wand2 className="w-4 h-4" /> Draft Launch Post
                              </button>
                            </div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* TAB 5.5: BRAINSTORM */}
        {activeTab === 'brainstorm' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] rounded-[2rem] p-8 shadow-sm flex flex-col h-[70vh]">
              <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100 dark:border-[#222]">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-indigo-500" />
                    Synthetic R&D Head
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Discuss insights and formulate a pivot.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleSummarizeAndPivot}
                    disabled={isSummarizing || brainstormMessages.length <= 1}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Summarize & Pivot
                  </button>
                </div>
              </div>

              {/* R&D Recommendations Section */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-5">
                   <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 mb-3 uppercase tracking-wider">
                     <span className="bg-emerald-200 dark:bg-emerald-800 p-1 rounded-full text-emerald-700 dark:text-emerald-300"><Plus className="w-3 h-3"/></span>
                     What to Add / Emphasize
                   </h4>
                   <ul className="space-y-2">
                     {report.insights.improvementRecommendations?.slice(0, 3).map((rec, i) => (
                       <li key={i} className="text-sm text-emerald-900 dark:text-emerald-300 flex items-start gap-2 leading-relaxed">
                         <span className="text-emerald-500 mt-1 flex-shrink-0">•</span> {rec}
                       </li>
                     ))}
                   </ul>
                 </div>
                 <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-5">
                   <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400 flex items-center gap-2 mb-3 uppercase tracking-wider">
                     <span className="bg-rose-200 dark:bg-rose-800 p-1 rounded-full text-rose-700 dark:text-rose-300"><Minus className="w-3 h-3"/></span>
                     What to Remove / Fix
                   </h4>
                   <ul className="space-y-2">
                     {report.insights.topConcerns?.slice(0, 3).map((conc, i) => (
                       <li key={i} className="text-sm text-rose-900 dark:text-rose-300 flex items-start gap-2 leading-relaxed">
                         <span className="text-rose-500 mt-1 flex-shrink-0">•</span> {conc}
                       </li>
                     ))}
                   </ul>
                 </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-4 mb-6">
                {brainstormMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-50 dark:bg-[#111] text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200 dark:border-[#222]'}`}>
                      {msg.role === 'user' ? (
                        <p className="text-sm">{msg.content}</p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isBrainstormLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-2xl rounded-bl-none p-4 flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="pt-4 border-t border-gray-100 dark:border-[#222]">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleBrainstormSend(); }}
                  className="flex items-center gap-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-full px-4 py-2 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 transition-colors"
                >
                  <input 
                    type="text"
                    value={brainstormInput}
                    onChange={(e) => setBrainstormInput(e.target.value)}
                    placeholder="E.g., What if we charge $99/mo instead of a one-time fee?"
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-900 dark:text-white py-2"
                  />
                  <button
                    type="button"
                    title="Speak"
                    onClick={(e) => {
                      e.preventDefault();
                      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                      if (!SpeechRecognition) return alert('Speech Recognition not supported in this browser.');
                      const recognition = new SpeechRecognition();
                      recognition.continuous = false;
                      recognition.interimResults = false;
                      recognition.lang = navigator.language || 'en-US';
                      recognition.onresult = (event: any) => {
                        const transcript = event.results[0][0].transcript;
                        setBrainstormInput(prev => prev ? prev + ' ' + transcript : transcript);
                      };
                      recognition.start();
                    }}
                    className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors flex items-center justify-center shrink-0 group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                  </button>
                  <button 
                    type="submit"
                    disabled={!brainstormInput.trim() || isBrainstormLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white p-2 rounded-full transition-colors flex items-center justify-center"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5.7: DEBATE */}
        {activeTab === 'debate' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] rounded-[2rem] p-8 shadow-sm flex flex-col h-[75vh]">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-gray-100 dark:border-[#222] gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Swords className="w-6 h-6 text-red-500" />
                    Live Persona Debate
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Watch two opposing personas argue over your idea.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={handleStartDebate}
                    disabled={isDebateRunning}
                    className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {isDebateRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                    {debateMessages.length > 0 ? 'Restart Debate' : 'Start Debate'}
                  </button>
                </div>
              </div>

              {/* Debate Setup Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 dark:bg-[#111] p-4 rounded-2xl border border-gray-100 dark:border-[#222]">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Debater 1 (Pro)</label>
                  <select 
                    value={debatePersona1Id}
                    onChange={(e) => setDebatePersona1Id(e.target.value)}
                    disabled={isDebateRunning}
                    className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white text-sm rounded-lg p-2 outline-none"
                  >
                    {personas.map(p => {
                      const sim = simulations.find(s => s.personaId === p.id);
                      return <option key={p.id} value={p.id}>{p.name} ({p.role}) - Score: {sim?.result.excitementScore}</option>;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Debater 2 (Con)</label>
                  <select 
                    value={debatePersona2Id}
                    onChange={(e) => setDebatePersona2Id(e.target.value)}
                    disabled={isDebateRunning}
                    className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white text-sm rounded-lg p-2 outline-none"
                  >
                    {personas.map(p => {
                      const sim = simulations.find(s => s.personaId === p.id);
                      return <option key={p.id} value={p.id}>{p.name} ({p.role}) - Score: {sim?.result.excitementScore}</option>;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Debate Topic / Focus</label>
                  <input 
                    type="text"
                    value={debateTopic}
                    onChange={(e) => setDebateTopic(e.target.value)}
                    disabled={isDebateRunning}
                    placeholder="e.g. pricing, market fit, UX..."
                    className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white text-sm rounded-lg p-2 outline-none"
                  />
                </div>
              </div>

              {/* Debate Chat Area */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-4 mb-4">
                {debateMessages.length === 0 && !isDebateRunning && !debateConclusion && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Swords className="w-12 h-12 mb-4 opacity-20" />
                    <p>Click "Start Debate" to watch them argue.</p>
                  </div>
                )}
                {debateMessages.map((msg, idx) => {
                  const persona = personas.find(p => p.id === msg.senderId);
                  const isUserPro = msg.senderId === 'user-pro';
                  const isUserCon = msg.senderId === 'user-con';
                  const isSystem = msg.senderId === 'system';
                  
                  // Pro is on left, Con is on right.
                  const isLeft = (msg.senderId === debatePersona1Id) || isUserPro;
                  
                  if (isSystem) {
                    return (
                      <div key={idx} className="flex justify-center">
                        <span className="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded-full">{msg.content}</span>
                      </div>
                    );
                  }

                  const displayName = isUserPro ? 'You (Supporting Pro)' : isUserCon ? 'You (Supporting Con)' : `${persona?.name} (${persona?.role})`;

                  return (
                    <div key={idx} className={`flex flex-col ${isLeft ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-center gap-2 mb-1 px-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">{displayName}</span>
                      </div>
                      <div className={`max-w-[85%] rounded-2xl p-5 ${isLeft ? 'bg-indigo-50 dark:bg-indigo-900/10 text-gray-800 dark:text-gray-200 rounded-bl-none border border-indigo-100 dark:border-indigo-900/30' : 'bg-red-50 dark:bg-red-900/10 text-gray-800 dark:text-gray-200 rounded-br-none border border-red-100 dark:border-red-900/30'}`}>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isDebateRunning && (
                  <div className={`flex justify-center my-4`}>
                    <div className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-full px-4 py-2 flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-medium uppercase tracking-widest">Generating Response...</span>
                    </div>
                  </div>
                )}
                {debateConclusion && (
                  <div className="mt-8 border-t border-gray-100 dark:border-[#222] pt-8">
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6">
                      <h4 className="text-amber-800 dark:text-amber-500 font-bold mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Debate Conclusion
                      </h4>
                      <p className="text-amber-900 dark:text-amber-200 text-sm leading-relaxed">{debateConclusion}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Debate Interactive Controls */}
              {debateMessages.length > 0 && !debateConclusion && (
                <div className="pt-4 border-t border-gray-100 dark:border-[#222] space-y-4">
                  <div className="flex gap-2 flex-wrap items-center">
                    <button
                      onClick={handleNextTurn}
                      disabled={isDebateRunning}
                      className="bg-gray-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    >
                      AI Continue (Next Turn)
                    </button>
                    <button
                      onClick={handleEndDebate}
                      disabled={isDebateRunning}
                      className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 px-4 py-2 rounded-full text-sm font-semibold hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50 transition-colors ml-auto"
                    >
                      End & Summarize Debate
                    </button>
                  </div>
                  
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleUserInterject(); }}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-2xl sm:rounded-full p-2 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 transition-colors"
                  >
                    <select
                      value={userDebateSide}
                      onChange={(e) => setUserDebateSide(e.target.value as 'pro' | 'con')}
                      disabled={isDebateRunning}
                      className="bg-transparent border-none text-xs font-bold uppercase text-gray-500 outline-none px-2 cursor-pointer"
                    >
                      <option value="pro">Join Pro</option>
                      <option value="con">Join Con</option>
                    </select>
                    <input 
                      type="text"
                      value={userDebateInput}
                      onChange={(e) => setUserDebateInput(e.target.value)}
                      disabled={isDebateRunning}
                      placeholder="Add your own argument to the debate..."
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-900 dark:text-white px-2 py-1"
                    />
                    <button 
                      type="submit"
                      disabled={!userDebateInput.trim() || isDebateRunning}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white p-2 rounded-full transition-colors flex items-center justify-center shrink-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}


        {/* TAB 6: VERSIONS */}
        {activeTab === 'versions' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {!versionHistory || versionHistory.length <= 1 ? (
              <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] rounded-[2rem] p-12 text-center">
                <History className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Run a Pivot to see version comparison</h3>
                <p className="text-gray-500 mt-2">Use the "Pivot Idea" button at the top to create a new version.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] rounded-[2rem] p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Version Comparison</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="p-4 border-b border-gray-200 dark:border-[#333] text-gray-500 font-semibold w-1/4">Metric</th>
                        {versionHistory?.map((v, i) => (
                          <th key={v.versionNumber} className="p-4 border-b border-gray-200 dark:border-[#333] text-gray-900 dark:text-white font-bold">
                            Version {i + 1} {i === versionHistory.length - 1 ? '(Current)' : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-4 border-b border-gray-100 dark:border-[#222] text-gray-600 dark:text-gray-400 font-medium">Description</td>
                        {versionHistory?.map(v => (
                          <td key={v.versionNumber} className="p-4 border-b border-gray-100 dark:border-[#222] text-sm text-gray-700 dark:text-gray-300">{v.ideaText.substring(0,100)}...</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-4 border-b border-gray-100 dark:border-[#222] text-gray-600 dark:text-gray-400 font-medium">Interest Score</td>
                        {versionHistory?.map((v, i) => {
                          const prev = i > 0 ? versionHistory[i-1].overallInterest : v.overallInterest;
                          const diff = v.overallInterest - prev;
                          return (
                            <td key={v.versionNumber} className="p-4 border-b border-gray-100 dark:border-[#222] text-lg font-bold text-gray-900 dark:text-white">
                              {v.overallInterest}%
                              {diff !== 0 && (
                                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${diff > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {diff > 0 ? '+' : ''}{diff}%
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

      </div>

      <ChatDrawer 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        ideaId={report.ideaId}
        context={chatContext}
        initialMessage={initialChatMessage}
        messages={chatDrawerMessages[chatContext?.targetId || 'general'] || []}
        setMessages={(newMessages) => setChatDrawerMessages(prev => ({ ...prev, [chatContext?.targetId || 'general']: newMessages }))}
      />

      {/* Asset Generation Modal */}
      <AnimatePresence>
        {assetTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setAssetTarget(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-[#222] flex justify-between items-center bg-gray-50 dark:bg-[#0a0a0a]">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Generated Asset
                </h3>
                <button onClick={() => setAssetTarget(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {isGeneratingAsset ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                    <p>Generating asset based on audience feedback...</p>
                  </div>
                ) : (
                  <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                    <ReactMarkdown>{assetMarkdown || ''}</ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pivot Modal */}
      <AnimatePresence>
        {isPivotModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setIsPivotModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl w-full max-w-xl p-8"
            >
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Wand2 className="w-6 h-6 text-indigo-500" />
                Pivot Your Idea
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                How would you like to change your product based on this feedback? We will rewrite your idea and automatically run a brand new simulation.
              </p>
              <textarea
                value={pivotInstruction}
                onChange={(e) => setPivotInstruction(e.target.value)}
                placeholder="e.g., Change the pricing model to be entirely free but ad-supported, and target younger demographics instead."
                className="w-full h-32 p-4 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white mb-6 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsPivotModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePivot}
                  disabled={!pivotInstruction.trim() || isPivoting}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPivoting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Simulating Pivot...</>
                  ) : (
                    <><Wand2 className="w-4 h-4" /> Run Pivot Simulation</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="hidden-report-content" className="hidden">
        <ReactMarkdown>{report.fullReportMarkdown || '# Report Missing'}</ReactMarkdown>
      </div>

    </div>
  );
};
