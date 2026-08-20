import React, { useState, useEffect } from 'react';
import { SimulationView } from './components/SimulationView';
import type { Persona, Simulation } from './services/api';

const MOCK_PERSONAS: Persona[] = [
  { id: '1', name: 'Sarah Chen', age: 29, role: 'Product Manager', segment: 'Early Adopters', experience: 'Senior', location: 'San Francisco', occupation: 'PM at Stripe', technicalAbility: 'high', priceSensitivity: 'low', riskTolerance: 'high', currentTools: ['Notion', 'Linear'], existingAlternatives: ['Typeform'], motivations: ['Ship faster'], frustrations: ['Too many tools'], concerns: ['Integration'], goals: ['Efficiency'], painPoints: ['Context switching'], preferences: ['Minimal UI'], personalityTraits: ['Analytical'], adoptionTendency: 'early_adopter' },
  { id: '2', name: 'Marcus Johnson', age: 35, role: 'CTO', segment: 'Decision Makers', experience: 'Expert', location: 'New York', occupation: 'CTO at Fintech Startup', technicalAbility: 'high', priceSensitivity: 'medium', riskTolerance: 'medium', currentTools: ['AWS', 'Terraform'], existingAlternatives: ['Custom solutions'], motivations: ['Scale team'], frustrations: ['Hiring'], concerns: ['Security'], goals: ['Reliability'], painPoints: ['Tech debt'], preferences: ['Enterprise grade'], personalityTraits: ['Strategic'], adoptionTendency: 'pragmatist' },
  { id: '3', name: 'Priya Sharma', age: 24, role: 'UX Designer', segment: 'Creative Professionals', experience: 'Junior', location: 'Bangalore', occupation: 'Designer at Agency', technicalAbility: 'medium', priceSensitivity: 'high', riskTolerance: 'high', currentTools: ['Figma', 'Miro'], existingAlternatives: ['Sketch'], motivations: ['Better workflows'], frustrations: ['Client feedback loops'], concerns: ['Learning curve'], goals: ['Portfolio growth'], painPoints: ['Revision hell'], preferences: ['Visual tools'], personalityTraits: ['Creative'], adoptionTendency: 'early_adopter' },
  { id: '4', name: 'David Kim', age: 42, role: 'Enterprise Buyer', segment: 'Corporate', experience: 'Expert', location: 'Seattle', occupation: 'VP Engineering at Fortune 500', technicalAbility: 'medium', priceSensitivity: 'low', riskTolerance: 'low', currentTools: ['Jira', 'Confluence'], existingAlternatives: ['ServiceNow'], motivations: ['Compliance'], frustrations: ['Vendor lock-in'], concerns: ['Data privacy'], goals: ['Reduce costs'], painPoints: ['Slow procurement'], preferences: ['SOC2 certified'], personalityTraits: ['Cautious'], adoptionTendency: 'skeptic' },
  { id: '5', name: 'Emma Wilson', age: 31, role: 'Indie Hacker', segment: 'Solo Founders', experience: 'Mid', location: 'London', occupation: 'Solo Founder', technicalAbility: 'high', priceSensitivity: 'high', riskTolerance: 'high', currentTools: ['VS Code', 'Vercel'], existingAlternatives: ['Building from scratch'], motivations: ['Launch fast'], frustrations: ['No co-founder'], concerns: ['Pricing'], goals: ['MRR'], painPoints: ['Wearing all hats'], preferences: ['Free tier'], personalityTraits: ['Resourceful'], adoptionTendency: 'innovator' },
  { id: '6', name: 'James Rodriguez', age: 38, role: 'Marketing Director', segment: 'Growth Teams', experience: 'Senior', location: 'Austin', occupation: 'Head of Growth', technicalAbility: 'low', priceSensitivity: 'medium', riskTolerance: 'medium', currentTools: ['HubSpot', 'Mixpanel'], existingAlternatives: ['Google Analytics'], motivations: ['Better attribution'], frustrations: ['Data silos'], concerns: ['ROI proof'], goals: ['2x pipeline'], painPoints: ['Reporting'], preferences: ['Dashboard-first'], personalityTraits: ['Data-driven'], adoptionTendency: 'pragmatist' },
  { id: '7', name: 'Aisha Patel', age: 27, role: 'ML Engineer', segment: 'Technical Users', experience: 'Mid', location: 'Toronto', occupation: 'ML Engineer at AI Lab', technicalAbility: 'high', priceSensitivity: 'medium', riskTolerance: 'high', currentTools: ['PyTorch', 'Jupyter'], existingAlternatives: ['Weights & Biases'], motivations: ['Experiment tracking'], frustrations: ['GPU costs'], concerns: ['Vendor lock-in'], goals: ['Research papers'], painPoints: ['Reproducibility'], preferences: ['Open source'], personalityTraits: ['Curious'], adoptionTendency: 'early_adopter' },
  { id: '8', name: 'Tom Baker', age: 55, role: 'CFO', segment: 'Finance', experience: 'Expert', location: 'Chicago', occupation: 'CFO at Mid-market SaaS', technicalAbility: 'low', priceSensitivity: 'high', riskTolerance: 'low', currentTools: ['Excel', 'QuickBooks'], existingAlternatives: ['Existing vendor'], motivations: ['Cost reduction'], frustrations: ['SaaS sprawl'], concerns: ['Budget approval'], goals: ['Consolidate tools'], painPoints: ['Too many subscriptions'], preferences: ['Annual billing discount'], personalityTraits: ['Conservative'], adoptionTendency: 'laggard' },
  { id: '9', name: 'Luna Garcia', age: 22, role: 'CS Student', segment: 'Students', experience: 'Beginner', location: 'Mexico City', occupation: 'Computer Science Student', technicalAbility: 'medium', priceSensitivity: 'high', riskTolerance: 'high', currentTools: ['GitHub', 'Discord'], existingAlternatives: ['Free tools'], motivations: ['Learn new tech'], frustrations: ['Paywalls'], concerns: ['Is it free?'], goals: ['Get hired'], painPoints: ['No real projects'], preferences: ['Free forever'], personalityTraits: ['Enthusiastic'], adoptionTendency: 'innovator' },
  { id: '10', name: 'Oliver Zhang', age: 33, role: 'DevOps Lead', segment: 'Platform Teams', experience: 'Senior', location: 'Singapore', occupation: 'Platform Lead', technicalAbility: 'high', priceSensitivity: 'medium', riskTolerance: 'medium', currentTools: ['Kubernetes', 'Datadog'], existingAlternatives: ['In-house tooling'], motivations: ['Reduce toil'], frustrations: ['On-call fatigue'], concerns: ['Migration effort'], goals: ['99.99% uptime'], painPoints: ['Alert noise'], preferences: ['CLI-first'], personalityTraits: ['Methodical'], adoptionTendency: 'pragmatist' },
];

const MOCK_REACTIONS = [
  { reaction: "This is exactly what I needed!", reactionEmoji: "🤩", excitementScore: 9, mainAttraction: "Saves me hours every week", mainConcern: "Pricing tiers" },
  { reaction: "Interesting but I have concerns", reactionEmoji: "🤔", excitementScore: 5, mainAttraction: "Novel approach", mainConcern: "Enterprise readiness" },
  { reaction: "Love the concept, would try it", reactionEmoji: "😊", excitementScore: 7, mainAttraction: "Clean interface", mainConcern: "Integration with existing tools" },
  { reaction: "Not sure this is for us", reactionEmoji: "😐", excitementScore: 3, mainAttraction: "The idea is sound", mainConcern: "Too risky for enterprise" },
  { reaction: "Take my money!", reactionEmoji: "🔥", excitementScore: 10, mainAttraction: "Game changer for solo founders", mainConcern: "None, ship it!" },
  { reaction: "I like it but need more data", reactionEmoji: "🧐", excitementScore: 6, mainAttraction: "Data-driven approach", mainConcern: "ROI unclear" },
  { reaction: "This could replace our current stack", reactionEmoji: "🚀", excitementScore: 8, mainAttraction: "All-in-one solution", mainConcern: "Migration path" },
  { reaction: "Way too expensive for what it does", reactionEmoji: "👎", excitementScore: 2, mainAttraction: "Nothing unique", mainConcern: "Overpriced" },
  { reaction: "Cool for side projects!", reactionEmoji: "💡", excitementScore: 7, mainAttraction: "Free tier is generous", mainConcern: "Will it scale?" },
  { reaction: "Need to see it in action first", reactionEmoji: "👀", excitementScore: 6, mainAttraction: "Promising roadmap", mainConcern: "Unproven technology" },
];

const MOCK_ANALYSIS = {
  industry: 'SaaS / Developer Tools',
  targetAudience: 'Software teams and indie hackers',
  stakeholders: ['Developers', 'Product Managers', 'CTOs'],
  businessType: 'B2B SaaS',
  competitors: ['Notion', 'Linear', 'Jira'],
  keyValueProposition: 'AI-powered project management',
  audienceComposition: [],
  experts: [],
  summary: 'An AI-powered project management tool for modern software teams.',
};

export default function VisualTestPage() {
  const [status, setStatus] = useState<'analyzing' | 'generating' | 'simulating' | 'done'>('simulating');
  const [sims, setSims] = useState<Simulation[]>([]);
  const [cycle, setCycle] = useState(0);

  // Drip-feed simulations one by one
  useEffect(() => {
    if (status !== 'simulating') return;

    const timers: number[] = [];
    MOCK_PERSONAS.forEach((persona, i) => {
      const t = window.setTimeout(() => {
        setSims(prev => {
          if (prev.find(s => s.personaId === persona.id)) return prev;
          return [...prev, {
            id: `sim-${persona.id}`,
            ideaId: 'test',
            personaId: persona.id,
            persona: persona,
            result: {
              ...MOCK_REACTIONS[i % MOCK_REACTIONS.length],
              interestScore: MOCK_REACTIONS[i % MOCK_REACTIONS.length].excitementScore,
              sentiment: 'positive',
              wouldTry: true,
              wouldPay: i % 3 !== 0,
              concerns: ['Pricing'],
              objections: [],
              likelihoodToUse: 7,
              suggestions: [],
              questions: [],
              whatWouldChangeTheirMind: 'Lower price',
            } as any,
          }];
        });
      }, 3000 + i * 2500); // stagger every 2.5s starting at 3s
      timers.push(t);
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, [status, cycle]);

  const handleReset = () => {
    setSims([]);
    setCycle(c => c + 1);
    setStatus('analyzing');
    setTimeout(() => setStatus('generating'), 2000);
    setTimeout(() => setStatus('simulating'), 4000);
  };

  return (
    <div className="min-h-screen bg-framer-bg dark:bg-[#050505]">
      {/* Control Bar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-full px-4 py-2 shadow-lg">
        <span className="text-xs text-gray-500 dark:text-gray-400 self-center mr-2 font-mono">VISUAL TEST</span>
        {(['analyzing', 'generating', 'simulating', 'done'] as const).map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s); if (s === 'simulating') { setSims([]); setCycle(c => c + 1); } }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${status === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]'}`}
          >
            {s}
          </button>
        ))}
        <button onClick={handleReset} className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 transition-colors">
          Reset
        </button>
        <span className="text-xs text-gray-400 self-center ml-2 font-mono">{sims.length}/{MOCK_PERSONAS.length} done</span>
      </div>

      <SimulationView
        status={status}
        analysis={MOCK_ANALYSIS as any}
        personas={MOCK_PERSONAS}
        simulations={sims}
      />
    </div>
  );
}
