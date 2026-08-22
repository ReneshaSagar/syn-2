import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, LayoutDashboard, Users, FileText, ChevronDown, Clock, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { fetchHistory } from '../services/api';

interface LandingPageProps {
  onSubmitIdea: (idea: string) => void;
  onLoadHistory: (ideaId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSubmitIdea, onLoadHistory }) => {
  const [idea, setIdea] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchHistory()
      .then(data => setHistory(data.history || []))
      .catch(console.error);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) {
      setIsFocused(false);
      onSubmitIdea(idea);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIdea(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = '60px'; // Reset to min-height to calculate properly
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const scrollToMore = () => {
    document.getElementById('learn-more')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen bg-framer-bg dark:bg-[#050505]">
      
      {/* History Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0, x: -50 }}
            animate={{ width: 340, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -50 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="bg-transparent border-r border-framer-border dark:border-[#222] p-6 hidden md:flex flex-col overflow-y-auto z-40 relative overflow-hidden shrink-0"
          >
            <div className="flex justify-between items-center mb-8 whitespace-nowrap w-72">
              <div className="flex items-center gap-2 text-framer-muted dark:text-gray-400">
                <History className="w-5 h-5" />
                <h2 className="text-sm font-bold tracking-wide uppercase">Past R&D Reports</h2>
              </div>
            </div>
            
            <div className="space-y-4 w-72 pb-12">
            {history.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-[2rem] bg-white/50 dark:bg-[#0a0a0a]/50 border border-dashed border-framer-border dark:border-[#333]">
                  <p className="text-framer-muted dark:text-gray-500 text-sm">No past ideas yet.</p>
                  <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Simulate an idea to see it here.</p>
                </div>
              ) : (
                history.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onLoadHistory(item.id)}
                    className="text-left w-full p-5 rounded-[1.5rem] bg-white dark:bg-[#0a0a0a] border border-framer-border dark:border-[#333] shadow-framer dark:shadow-none hover:shadow-framer-hover hover:-translate-y-1 transition-all duration-300 group"
                  >
                    <p className="text-sm font-medium text-framer-text dark:text-white line-clamp-3 leading-relaxed group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.rawText}
                    </p>
                    <div className="flex items-center gap-2 mt-4 opacity-60 group-hover:opacity-100 transition-opacity">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <p className="text-xs text-framer-muted dark:text-gray-400 font-medium">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col flex-1 relative transition-colors duration-500 overflow-y-auto text-framer-text dark:text-white selection:bg-gray-200 dark:selection:bg-[#222]">
        
        {/* Sidebar Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-6 left-6 z-50 p-3 rounded-full bg-white dark:bg-[#111] border border-framer-border dark:border-[#222] shadow-sm hover:shadow-md text-framer-muted dark:text-gray-400 hover:text-framer-text dark:hover:text-white transition-all hidden md:block"
        >
          {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>
        
        {/* Spotlight Backdrop */}
        <AnimatePresence>
          {isFocused && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 z-40 bg-framer-bg/40 dark:bg-[#050505]/60 backdrop-blur-sm"
              onClick={() => setIsFocused(false)}
            />
          )}
        </AnimatePresence>

        {/* Soft Ambient Background Blurs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-blue-100 dark:bg-blue-900/30 rounded-full blur-[120px] opacity-60 transition-colors duration-500" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-purple-100 dark:bg-purple-900/30 rounded-full blur-[120px] opacity-60 transition-colors duration-500" />
        </div>

        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center min-h-[100vh] p-6 relative">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl w-full text-center space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#111] shadow-sm border border-framer-border dark:border-[#222] text-sm font-medium text-gray-600 dark:text-gray-300 mb-4 transition-colors duration-500 relative">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>✨ Meet your instant R&D team</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-semibold tracking-tight text-framer-text dark:text-white leading-[1.1] transition-colors duration-500 relative">
              Test your idea before the world does.
            </h1>
            
            <p className="text-xl md:text-2xl text-framer-muted dark:text-gray-400 font-light tracking-wide max-w-2xl mx-auto leading-relaxed transition-colors duration-500 relative">
              Spawn a Synthetic Audience and get your own instant R&D team to stress-test your startup before you spend a dime.
            </p>

            <motion.form 
              onSubmit={handleSubmit} 
              className="mt-16 w-full max-w-4xl mx-auto relative z-50"
              animate={{
                scale: isFocused ? 1.02 : 1,
                y: isFocused ? -20 : 0,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div className={`flex flex-col items-stretch gap-3 bg-white dark:bg-[#0a0a0a] border border-framer-border dark:border-[#333] rounded-[2rem] p-3 transition-all duration-500 ${isFocused ? 'shadow-2xl ring-4 ring-blue-500/20' : 'shadow-framer dark:shadow-none hover:shadow-framer-hover'}`}>
                <textarea
                  ref={textareaRef}
                  value={idea}
                  onChange={handleInput}
                  onFocus={() => setIsFocused(true)}
                  placeholder="Describe your startup, product, or feature concept in detail..."
                  className="w-full bg-transparent text-framer-text dark:text-white placeholder-gray-400 dark:placeholder-gray-600 p-4 text-xl resize-none focus:outline-none min-h-[60px]"
                  style={{ overflowY: idea.length > 0 && textareaRef.current && textareaRef.current.scrollHeight > 200 ? 'auto' : 'hidden' }}
                />
                <div className="flex justify-end pr-2 pb-2 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                      if (!SpeechRecognition) return alert('Speech Recognition not supported in this browser.');
                      const recognition = new SpeechRecognition();
                      recognition.continuous = false;
                      recognition.interimResults = false;
                      recognition.lang = navigator.language || 'en-US';
                      recognition.onstart = () => setIsFocused(true);
                      recognition.onresult = (event: any) => {
                        const transcript = event.results[0][0].transcript;
                        setIdea(prev => prev ? prev + ' ' + transcript : transcript);
                        if (textareaRef.current) {
                          textareaRef.current.style.height = '60px';
                          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
                        }
                      };
                      recognition.start();
                    }}
                    className="p-4 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#1a1a1a] dark:text-gray-400 dark:hover:bg-[#333] transition-colors flex items-center justify-center shrink-0 group"
                    title="Speak your idea"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                  </button>
                  <button
                    type="submit"
                    disabled={!idea.trim()}
                    className="px-8 py-4 rounded-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-[#222] dark:disabled:text-[#555] disabled:shadow-none shadow-md transition-all duration-300 flex items-center justify-center gap-2 font-medium text-lg shrink-0"
                  >
                    Simulate <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.form>
          </motion.div>

          {/* Scroll down indicator */}
          <motion.button 
            onClick={scrollToMore}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            transition={{ delay: 1.5, duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-12 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors bg-white/50 dark:bg-[#111]/50 backdrop-blur-sm p-3 rounded-full border border-framer-border dark:border-[#222] shadow-sm z-30"
          >
            <ChevronDown className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Learn More Section */}
        <div id="learn-more" className="w-full max-w-6xl mx-auto px-6 py-32 space-y-40 relative z-10">
          
          {/* Problem & Solution */}
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl font-semibold tracking-tight text-framer-text dark:text-white transition-colors duration-500">The Problem</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-xl font-light transition-colors duration-500">
                Founders and companies have no quick, unbiased way to validate their ideas before launching. Reddit is inconsistent, friends are biased, and research firms are slow.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-xl font-light transition-colors duration-500">
                As a result, teams spend months building products that users may not actually want.
              </p>
            </div>
            <div className="bg-white dark:bg-[#0A0A0A] border border-framer-border dark:border-[#222] p-12 rounded-[2rem] shadow-framer dark:shadow-none space-y-8 relative overflow-hidden group hover:shadow-framer-hover transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 transition-colors duration-500">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-semibold tracking-tight dark:text-white transition-colors duration-500">The Solution</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg font-light transition-colors duration-500">
                An AI-powered platform that generates a hyper-realistic synthetic audience to predict reactions. 
              </p>
              <p className="text-framer-text dark:text-white font-medium leading-relaxed text-lg transition-colors duration-500">
                Get instant feedback, objections, and insights instead of waiting weeks for real-world testing.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-semibold tracking-tight text-framer-text dark:text-white transition-colors duration-500">How It Works</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xl font-light transition-colors duration-500">Three simple steps to profound insights.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: FileText, title: "1. Idea Analysis", desc: "The AI parses your startup idea or feature concept and identifies the core target market automatically." },
                { icon: Users, title: "2. Audience Generation", desc: "We spawn distinct synthetic personas (e.g., students, founders, PMs) matching your exact demographics." },
                { icon: Sparkles, title: "3. Simulation", desc: "Each persona reacts independently, generating authentic thoughts, concerns, and a compiled insight report." }
              ].map((feature, idx) => (
                <div key={idx} className="bg-white dark:bg-[#0a0a0a] border border-framer-border dark:border-[#222] p-10 rounded-[2rem] hover:-translate-y-2 hover:shadow-framer-hover dark:shadow-none transition-all duration-500">
                  <div className="w-14 h-14 bg-gray-50 dark:bg-[#111] rounded-2xl flex items-center justify-center mb-8 text-black dark:text-white transition-colors duration-500">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 tracking-tight dark:text-white transition-colors duration-500">{feature.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-light text-lg transition-colors duration-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
