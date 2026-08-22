import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, Bot, Loader2 } from 'lucide-react';
import { sendChatMessage } from '../services/api';
import ReactMarkdown from 'react-markdown';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ideaId: string;
  context?: { type: 'persona' | 'general'; targetId?: string; personaName?: string };
  initialMessage?: string;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  onScoreUpdate?: (newScore: number) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose, ideaId, context, initialMessage, messages, setMessages, onScoreUpdate }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Initialize chat when opened with new context if empty
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      if (initialMessage) {
        setMessages([{ role: 'assistant', content: initialMessage }]);
      } else {
        const welcomeText = context?.type === 'persona' 
          ? `Hi, I'm ${context.personaName}. I reviewed your idea. What would you like to know about my feedback?`
          : `Hello! I'm your Principal Product Analyst. Ask me anything about the audience research report.`;
        setMessages([{ role: 'assistant', content: welcomeText }]);
      }
    }
  }, [isOpen, context?.targetId, initialMessage, messages.length, setMessages]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const result = await sendChatMessage(ideaId, newMessages, { type: context?.type || 'general', targetId: context?.targetId });
      setMessages([...newMessages, { role: 'assistant', content: result.response }]);
      
      if (result.newScore !== undefined && onScoreUpdate) {
        onScoreUpdate(result.newScore);
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered a network error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40"
          />
          
          {/* Drawer */}
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 w-full md:w-[450px] h-full bg-white dark:bg-[#0a0a0a] border-l border-gray-200 dark:border-[#222] shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-[#222]">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${context?.type === 'persona' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                  {context?.type === 'persona' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {context?.type === 'persona' ? `Chat with ${context.personaName}` : 'Report Analyst'}
                  </h3>
                  <p className="text-xs text-gray-500">Live conversation</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#111] rounded-full transition-colors text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 dark:bg-[#111] text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200 dark:border-[#222]'}`}>
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
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-2xl rounded-bl-none p-4 flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </div>

            {/* Suggested Prompts */}
            {context?.type !== 'persona' && messages.length <= 1 && (
              <div className="px-6 pb-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => { setInput('Run a Competitor Analysis'); }}
                  className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 px-3 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-left"
                >
                  Run a Competitor Analysis
                </button>
                <button 
                  onClick={() => { setInput('Calculate Market Sizing (TAM/SAM/SOM)'); }}
                  className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 px-3 py-1.5 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-left"
                >
                  Calculate Market Sizing (TAM/SAM/SOM)
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="p-6 border-t border-gray-100 dark:border-[#222] bg-white dark:bg-[#050505]">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-full px-4 py-2 focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-colors"
              >
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-900 dark:text-white py-2"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white p-2 rounded-full transition-colors flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
