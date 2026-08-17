import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Persona, Simulation, IdeaAnalysis } from '../services/api';
import { Loader2, Check } from 'lucide-react';

interface SimulationViewProps {
  status: 'analyzing' | 'generating' | 'simulating' | 'done';
  analysis: IdeaAnalysis | null;
  personas: Persona[];
  simulations: Simulation[];
}

// ==========================================
// PHASE 1: ANALYSIS & ASSEMBLY (Perplexity Style)
// ==========================================
const AnalysisPhase: React.FC<{ status: string, analysis: IdeaAnalysis | null }> = ({ status, analysis }) => {
  return (
    <motion.div 
      key="analysis-phase"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-4xl mx-auto bg-white/60 dark:bg-[#111]/60 backdrop-blur-xl border border-gray-200/50 dark:border-[#333]/50 rounded-[2rem] shadow-framer dark:shadow-2xl overflow-hidden transition-all duration-500"
    >
      <div className="p-12">
        <div className="flex items-center gap-4 mb-10">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white tracking-tight">
            Synthesizing Audience...
          </h2>
        </div>

        <div className="space-y-6 text-base">
          
          {/* Step 1 (Analyze) */}
          <div className="flex items-start gap-4">
            <div className="mt-1">
              {analysis ? (
                 <Check className="w-5 h-5 text-gray-400" />
              ) : (
                 <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              )}
            </div>
            <div>
              <p className={`font-medium ${analysis ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                Analyzing concept & target industry
              </p>
            </div>
          </div>

          {/* Step 2 (Generate Audience) */}
          {(status === 'generating' || status === 'simulating' || status === 'done') && analysis && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-4">
              <div className="mt-1">
                {status === 'generating' ? (
                   <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                   <Check className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className={`font-medium ${status === 'generating' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  Synthesizing dynamic audience segments
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 3 (Simulate & Competitors) */}
          {(status === 'simulating' || status === 'done') && analysis && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-4">
              <div className="mt-1">
                {status === 'simulating' ? (
                   <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                   <Check className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className={`font-medium ${status === 'simulating' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  Simulating reactions & gathering competitive intelligence
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 4 (Insights, Red Team, Report) */}
          {status === 'done' && analysis && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-4">
              <div className="mt-1">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Running Red Team analysis & compiling report
                </p>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </motion.div>
  );
};

import Matter from 'matter-js';

// ==========================================
// PHASE 2: THE CANVAS (Physics)
// ==========================================
const CanvasPhase: React.FC<{ personas: Persona[], simulations: Simulation[], status: string }> = ({ personas, simulations, status }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<(HTMLDivElement | null)[]>([]);
  
  const displayPersonas = personas.slice(0, 20);
  
  const THINKING_EMOJIS = ['🤔', '💭', '🧐', '🤨', '🤫', '😶', '🧠', '👀'];

  // Assign a static, random thinking emoji to each persona once
  const thinkingEmojis = React.useMemo(() => {
    return displayPersonas.map(() => THINKING_EMOJIS[Math.floor(Math.random() * THINKING_EMOJIS.length)]);
  }, [displayPersonas]);

  // Fallback realistic emojis based on their excitement score
  const getRealisticEmoji = (score: number, fallbackSeed: number) => {
    if (score >= 9) return ['🤩', '❤️', '🔥', '🚀', '🤯'][fallbackSeed % 5];
    if (score >= 7) return ['👍', '😊', '💡', '🙌', '😎'][fallbackSeed % 5];
    if (score >= 4) return ['🤔', '😐', '🤷', '🧐', '😬'][fallbackSeed % 5];
    return ['👎', '😡', '🥱', '🙅', '🤦'][fallbackSeed % 5];
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Setup Matter.js Engine
    const engine = Matter.Engine.create();
    engine.gravity.y = 0;
    engine.gravity.x = 0;
    
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    
    // Static walls to keep circles inside
    const wallOptions = { isStatic: true, friction: 0, restitution: 0.8 };
    const walls = [
      Matter.Bodies.rectangle(cw/2, -25, cw + 50, 50, wallOptions), // top
      Matter.Bodies.rectangle(cw/2, ch + 25, cw + 50, 50, wallOptions), // bottom
      Matter.Bodies.rectangle(-25, ch/2, 50, ch + 50, wallOptions), // left
      Matter.Bodies.rectangle(cw + 25, ch/2, 50, ch + 50, wallOptions) // right
    ];
    
    const bodies = displayPersonas.map(() => {
      const x = 50 + Math.random() * (cw - 100);
      const y = 50 + Math.random() * (ch - 100);
      return Matter.Bodies.circle(x, y, 24, {
        restitution: 0.8, // Bouncy
        frictionAir: 0.02,
        friction: 0.05,
        render: { visible: false } // Custom DOM rendering
      });
    });
    
    Matter.World.add(engine.world, [...walls, ...bodies]);
    
    // Mouse constraint for dragging
    const mouse = Matter.Mouse.create(containerRef.current);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } }
    });
    Matter.World.add(engine.world, mouseConstraint);
    
    // Initial velocity scatter
    bodies.forEach(b => {
      Matter.Body.setVelocity(b, { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 });
    });
    
    // Sync physics to React DOM
    Matter.Events.on(engine, 'afterUpdate', () => {
      bodies.forEach((body, i) => {
        const node = nodesRef.current[i];
        if (node) {
          node.style.transform = `translate(${body.position.x}px, ${body.position.y}px)`;
        }
      });
    });
    
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    
    return () => {
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, [displayPersonas.length]);

  return (
    <motion.div 
      key="canvas-phase"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-5xl flex flex-col items-center"
    >
      <div className="z-10 text-center mb-8 space-y-4">
        <div className="inline-flex items-center justify-center gap-3 bg-white dark:bg-[#111] px-5 py-2.5 rounded-full shadow-sm border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-300 font-medium text-sm transition-colors duration-500">
          {status !== 'done' && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
          <span>{status === 'simulating' ? 'Simulating persona reactions...' : 'Compiling insights report...'}</span>
        </div>
      </div>

      <div ref={containerRef} className="relative w-full h-[650px] max-w-[95%] border border-gray-200 dark:border-[#333] bg-white dark:bg-[#0a0a0a] rounded-3xl overflow-hidden shadow-sm">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 dark:opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#E5E7EB 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.5 }} />

        {displayPersonas.map((persona, idx) => {
          const sim = simulations.find(s => s?.personaId === persona?.id);
          const hue = (persona?.name.length * 40) % 360;
          const isDone = !!sim;
          
          let emoji = thinkingEmojis[idx];
          if (isDone) {
            emoji = sim.result?.reactionEmoji || '';
            // If LLM didn't return an emoji or just returned standard thumbs up, use realistic fallback based on score
            if (!emoji || emoji === '👍' || emoji.length > 2) {
               emoji = getRealisticEmoji(sim.result?.excitementScore || 5, hue);
            }
          }

          return (
            <div
              key={persona.id}
              ref={el => { nodesRef.current[idx] = el; }}
              className="absolute top-[-24px] left-[-24px] z-10 group cursor-grab active:cursor-grabbing w-12 h-12"
            >
              {/* Agent Avatar */}
              <div 
                className={`w-full h-full rounded-full flex items-center justify-center transition-all duration-300 ease-out border-2 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:border-blue-400 group-hover:z-50 ${isDone ? 'border-green-400' : 'border-white dark:border-[#111]'} shadow-sm`}
                style={{ backgroundColor: `hsl(${hue}, 70%, 90%)` }}
              >
                <span className="text-base font-semibold" style={{ color: `hsl(${hue}, 60%, 30%)` }}>
                  {persona?.name?.charAt(0) || 'U'}
                </span>
                
                {/* Emoji Badge */}
                <div className="absolute -top-1 -right-1 bg-white dark:bg-[#1a1a1a] rounded-full p-[2px] shadow-sm border border-gray-100 dark:border-[#333] flex items-center justify-center text-sm w-6 h-6 z-20 transition-all duration-300">
                  {emoji}
                </div>
              </div>
              
              {/* Hover Info */}
              <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0 top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-48 bg-white/95 dark:bg-black/95 backdrop-blur-md border border-gray-100 dark:border-[#333] shadow-xl px-4 py-3 rounded-xl z-50 pointer-events-none text-center">
                <span className="font-bold block text-sm text-gray-900 dark:text-white">{persona.name}</span>
                <span className="block text-[10px] font-semibold tracking-wide text-gray-500 uppercase mt-1">{persona.role}</span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export const SimulationView: React.FC<SimulationViewProps> = ({ status, analysis, personas, simulations }) => {
  const isPhase1 = status === 'analyzing' || status === 'generating';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-framer-bg dark:bg-[#050505] transition-colors duration-500">
      <AnimatePresence mode="wait">
        {isPhase1 ? (
          <AnalysisPhase status={status} analysis={analysis} />
        ) : (
          <CanvasPhase personas={personas} simulations={simulations} status={status} />
        )}
      </AnimatePresence>
    </div>
  );
};
