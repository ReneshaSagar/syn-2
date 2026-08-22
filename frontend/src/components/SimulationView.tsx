import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Persona, Simulation, IdeaAnalysis } from '../services/api';
import { Loader2, Check } from 'lucide-react';

interface SimulationViewProps {
  status: 'analyzing' | 'generating' | 'simulating' | 'done';
  analysis: IdeaAnalysis | null;
  personas: Persona[];
  simulations: Simulation[];
}

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
            Assembling your R&D Team...
          </h2>
        </div>

        <div className="space-y-6 text-base">
          <div className="flex items-start gap-4">
            <div className="mt-1">
              {analysis ? <Check className="w-5 h-5 text-gray-400" /> : <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
            </div>
            <div>
              <p className={`font-medium ${analysis ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                Analyzing concept & target industry
              </p>
            </div>
          </div>

          {(status === 'generating' || status === 'simulating' || status === 'done') && analysis && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-4">
              <div className="mt-1">
                {status === 'generating' ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : <Check className="w-5 h-5 text-gray-400" />}
              </div>
              <div>
                <p className={`font-medium ${status === 'generating' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  Recruiting synthetic audience personas
                </p>
              </div>
            </motion.div>
          )}

          {(status === 'simulating' || status === 'done') && analysis && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-4">
              <div className="mt-1">
                {status === 'simulating' ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : <Check className="w-5 h-5 text-gray-400" />}
              </div>
              <div>
                <p className={`font-medium ${status === 'simulating' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  Running Synthetic R&D Focus Group
                </p>
              </div>
            </motion.div>
          )}

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

const SPRITE_COLS = 4;
const SPRITE_ROWS = 4;
const SPRITE_COUNT = SPRITE_COLS * SPRITE_ROWS;

const getSpritePosition = (index: number) => {
  const col = index % SPRITE_COLS;
  const row = Math.floor(index / SPRITE_COLS);
  return {
    bgPosX: (col / (SPRITE_COLS - 1)) * 100,
    bgPosY: (row / (SPRITE_ROWS - 1)) * 100,
  };
};

const THINKING_PHRASES = [
  "Hmm interesting...",
  "Let me think...",
  "I have concerns",
  "This could work!",
  "What about pricing?",
  "Who else does this?",
  "I'd try it...",
  "Not convinced yet",
  "Tell me more...",
  "Sounds risky...",
  "I like this idea",
  "Need more data...",
];

const SpeechBubble: React.FC<{ text: string, emoji?: string, isDone: boolean, position: 'top' | 'bottom' }> = ({ text, emoji, isDone, position }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: position === 'top' ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: 'spring', damping: 15, stiffness: 300 }}
      className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 z-40 pointer-events-none`}
    >
      <div className={`relative px-3 py-2 rounded-lg text-center shadow-lg min-w-[60px] max-w-[200px] md:max-w-[260px] ${
        isDone 
          ? 'bg-green-50 dark:bg-green-900/60 border-2 border-green-400 dark:border-green-600' 
          : 'bg-white dark:bg-[#1a1a1a] border-2 border-gray-300 dark:border-[#555] min-w-[32px]'
      }`}
        style={{ imageRendering: 'pixelated' }}
      >
        <div 
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '6px', lineHeight: '1.8' }}
          className={`break-words ${isDone ? 'text-green-800 dark:text-green-200' : 'text-gray-700 dark:text-gray-300'}`}
        >
          {emoji && <span className="mr-1 text-[10px]">{emoji}</span>}
          {isDone ? text : <span className="typing-dots">{text.replace(/\.+$/, '')}</span>}
        </div>
        <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-1/2 -translate-x-1/2`}>
          <div className={`w-0 h-0 border-l-[6px] border-r-[6px] border-l-transparent border-r-transparent ${
            position === 'top'
              ? (isDone ? 'border-t-[6px] border-t-green-400 dark:border-t-green-600' : 'border-t-[6px] border-t-gray-300 dark:border-t-[#555]')
              : (isDone ? 'border-b-[6px] border-b-green-400 dark:border-b-green-600' : 'border-b-[6px] border-b-gray-300 dark:border-b-[#555]')
          }`} />
        </div>
      </div>
    </motion.div>
  );
};

const FocusGroupRoom: React.FC<{ personas: Persona[], simulations: Simulation[], status: string }> = ({ personas, simulations, status }) => {
  const displayPersonas = personas.slice(0, 12);
  const [activeBubbles, setActiveBubbles] = useState<Record<number, { text: string, emoji?: string, isDone: boolean }>>({});
  const bubbleTimerRef = useRef<number | null>(null);

  const spriteIndices = useMemo(() => {
    return displayPersonas.map((_, i) => i % SPRITE_COUNT);
  }, [displayPersonas.length]);

  const seatPositions = useMemo(() => {
    const count = displayPersonas.length;
    if (count === 0) return [];

    const predefinedSeats = [
      // Top 4
      { x: 38.5, y: 35 }, { x: 46.5, y: 35 }, { x: 54.5, y: 35 }, { x: 62.5, y: 35 },
      // Bottom 4
      { x: 38.5, y: 72 }, { x: 46.5, y: 72 }, { x: 54.5, y: 72 }, { x: 62.5, y: 72 },
      // Left 2 (removed the squished middle seat)
      { x: 27, y: 45 }, { x: 27, y: 60 },
      // Right 2
      { x: 74, y: 45 }, { x: 74, y: 60 },
    ];

    return displayPersonas.map((_, i) => {
      const seat = predefinedSeats[i % predefinedSeats.length];
      return {
        x: seat.x,
        y: seat.y,
        bubblePos: (seat.y < 45 ? 'top' : 'bottom') as 'top' | 'bottom',
      };
    });
  }, [displayPersonas.length]);

  const getReactionEmoji = (score: number, seed: number) => {
    if (score >= 9) return ['🤩', '❤️', '🔥', '🚀', '🤯'][seed % 5];
    if (score >= 7) return ['👍', '😊', '💡', '🙌', '😎'][seed % 5];
    if (score >= 4) return ['🤔', '😐', '🤷', '🧐', '😬'][seed % 5];
    return ['👎', '😡', '🥱', '🙅', '🤦'][seed % 5];
  };

  useEffect(() => {
    if (status !== 'simulating' && status !== 'done') return;

    const showRandomBubble = () => {
      // Don't show too many bubbles at once
      setActiveBubbles(prev => {
        // Strict limit of 2 concurrent bubbles for a more natural conversation flow
        if (Object.keys(prev).length >= 2) return prev;
        
        const idx = Math.floor(Math.random() * displayPersonas.length);
        if (prev[idx]) return prev; // already showing

        const persona = displayPersonas[idx];
        const sim = simulations.find(s => s?.personaId === persona?.id);
        
        let bubbleData;
        if (sim?.result && status === 'done') {
          // Final reaction
          const score = sim.result.excitementScore || 5;
          let emoji = sim.result.reactionEmoji || getReactionEmoji(score, idx);
          if (emoji.length > 2) emoji = getReactionEmoji(score, idx);
          const text = sim.result.reaction || sim.result.mainAttraction || 'Reviewed!';
          bubbleData = { text, emoji, isDone: true };
        } else {
          // Thinking phase - just the animated ...
          bubbleData = { text: '', isDone: false };
        }

        setTimeout(() => {
          setActiveBubbles(current => {
            const next = { ...current };
            delete next[idx];
            return next;
          });
        }, 4000 + Math.random() * 3000); // stay on screen for 4-7 seconds

        return { ...prev, [idx]: bubbleData };
      });
    };

    // Initial staggered bubbles
    setTimeout(() => showRandomBubble(), 1000);
    setTimeout(() => showRandomBubble(), 3000);

    bubbleTimerRef.current = window.setInterval(() => {
      showRandomBubble();
    }, 2500); // Wait longer between new bubble spawns

    return () => {
      if (bubbleTimerRef.current) clearInterval(bubbleTimerRef.current);
    };
  }, [status, displayPersonas.length, simulations]);

  return (
    <motion.div
      key="focusgroup-phase"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full max-w-7xl flex flex-col items-center"
    >
      <div className="z-10 text-center mb-6 space-y-3">
        <div className="inline-flex items-center justify-center gap-3 bg-white dark:bg-[#111] px-5 py-2.5 rounded-full shadow-sm border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-300 font-medium text-sm">
          {status !== 'done' && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
          <span>{status === 'generating_audience' ? '🧬 Assembling your Synthetic Audience...' : (status === 'simulating' ? '🎙️ R&D Focus Group in session...' : '📑 Compiling final R&D report...')}</span>
        </div>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }} className="text-gray-400 dark:text-gray-500">
          {displayPersonas.length} TEAM MEMBERS ASSEMBLED
        </p>
      </div>

      <div className="relative w-full max-w-[1200px] aspect-[16/9] rounded-xl border-4 border-[#2C2016] shadow-2xl" style={{ imageRendering: 'auto' }}>
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          <img
            src="/assets/room.jpg"
            alt="Focus Group Room"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ imageRendering: 'auto' }}
            draggable={false}
          />
        </div>

        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }} />

        {displayPersonas.map((persona, idx) => {
          const pos = seatPositions[idx];
          if (!pos) return null;

          const sim = simulations.find(s => s?.personaId === persona?.id);
          const isDone = !!sim;
          const spriteIdx = spriteIndices[idx];
          const spritePos = getSpritePosition(spriteIdx);

          const activeBubble = activeBubbles[idx];
          let bubbleText = activeBubble?.text || '';
          let bubbleEmoji = activeBubble?.emoji;
          let isDoneBubble = activeBubble?.isDone || false;

          return (
            <motion.div
              key={persona.id}
              initial={{ opacity: 0, scale: 0, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.15, type: 'spring', damping: 12, stiffness: 180 }}
              className="absolute z-10 group flex flex-col items-center"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: '6.22%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <AnimatePresence>
                {activeBubble && (
                  <SpeechBubble
                    text={bubbleText}
                    emoji={bubbleEmoji}
                    isDone={isDoneBubble}
                    position={pos.bubblePos}
                  />
                )}
              </AnimatePresence>

              <div className="flex flex-col items-center gap-0.5 w-full">
                <div
                  className={`relative transition-all duration-500 w-full aspect-square ${isDone ? 'drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : ''}`}
                  style={{
                    animation: `
                      idle-bob-${idx % 3} ${1.8 + (idx % 5) * 0.3}s ease-in-out infinite,
                      idle-sway-${idx % 2} ${2.5 + (idx % 4) * 0.4}s ease-in-out infinite
                    `,
                    animationDelay: `${idx * 0.2}s`,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundImage: `url(/assets/sprites.png)`,
                      backgroundSize: `${SPRITE_COLS * 100}% ${SPRITE_ROWS * 100}%`,
                      backgroundPosition: `${spritePos.bgPosX}% ${spritePos.bgPosY}%`,
                      imageRendering: 'pixelated',
                    }}
                  />

                  {isDone && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-green-700 flex items-center justify-center shadow-sm z-20"
                    >
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </div>

                <div className="bg-black/75 px-1.5 py-0.5 rounded-sm mt-0.5">
                  <span
                    style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '5px', color: '#eee', whiteSpace: 'nowrap' }}
                  >
                    {persona.name?.split(' ')[0]?.substring(0, 8) || 'Agent'}
                  </span>
                </div>
              </div>

              <div className={`absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 left-1/2 -translate-x-1/2 w-44 bg-white/95 dark:bg-black/95 backdrop-blur-md border border-gray-200 dark:border-[#333] shadow-xl px-3 py-2 rounded-lg z-50 pointer-events-none text-center ${
                pos.y > 60 ? 'bottom-full mb-2' : 'top-full mt-6'
              }`}>
                <span className="font-bold block text-xs text-gray-900 dark:text-white">{persona.name}</span>
                <span className="block text-[10px] text-gray-500 mt-0.5">{persona.role}</span>
                <span className="block text-[10px] text-gray-400 mt-0.5">{persona.segment}</span>
              </div>
            </motion.div>
          );
        })}

        {/* Observation Room Label */}
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-black/70 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#aaa' }}>
              🔍 OBSERVATION ROOM
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const SimulationView: React.FC<SimulationViewProps> = ({ status, analysis, personas, simulations }) => {
  const isPhase1 = status === 'analyzing' || status === 'generating';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-framer-bg dark:bg-[#050505] transition-colors duration-500">
      <AnimatePresence mode="wait">
        {isPhase1 ? (
          <AnalysisPhase status={status} analysis={analysis} />
        ) : (
          <FocusGroupRoom personas={personas} simulations={simulations} status={status} />
        )}
      </AnimatePresence>
    </div>
  );
};
