'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { 
  Music, Plus, Users, ArrowRight, Sparkles, 
  ShieldCheck, Zap, Laptop, Globe 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();
  const { room, createRoom, joinRoom, error, clearError } = useRoom();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'initial' | 'create' | 'join'>('initial');

  useEffect(() => {
    if (room) {
      router.push(`/room/${room.roomId}`);
    }
  }, [room, router]);

  const handleCreate = () => {
    if (!name.trim()) return;
    setMode('create'); // Ensure mode is set
    createRoom(name);
  };

  const handleJoin = () => {
    if (!name.trim() || !roomCode.trim()) return;
    joinRoom(roomCode.toUpperCase(), name);
  };

  return (
    <main className="min-h-screen relative bg-surface-900 flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] bg-brand-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[60%] bg-brand-accent/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center z-10">
        {/* Left Side: Copy */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect text-xs font-bold text-indigo-400 border-indigo-500/10">
            <Sparkles className="w-4 h-4" /> 
            <span>THE FUTURE OF SOCIAL LISTENING</span>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.95]">
              Sync <br />
              <span className="text-gradient">Music.</span> <br />
              Anywhere.
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-md leading-relaxed">
              MusicRoom lets you listen to YouTube together in perfect real-time sync. No latency, just vibes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <ShieldCheck className="w-5 h-5" /> 100% Private
              </div>
              <p className="text-xs text-slate-500">No data sharing, no logs, just your room.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <Zap className="w-5 h-5" /> Zero Lag
              </div>
              <p className="text-xs text-slate-500">Optimized socket layer for sub-millisecond sync.</p>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Action Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-accent rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative glass-effect p-10 md:p-12 rounded-[2.5rem] shadow-2xl space-y-8">
            <div className="flex gap-4 p-1.5 bg-surface-900/50 rounded-2xl border border-white/5">
              <button 
                onClick={() => setMode('create')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${mode === 'create' || mode === 'initial' ? 'bg-surface-700 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
              >
                Create Room
              </button>
              <button 
                onClick={() => setMode('join')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${mode === 'join' ? 'bg-surface-700 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
              >
                Join Room
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={mode === 'join' ? 'join' : 'create'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Your Alias</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (error) clearError();
                      }}
                      placeholder="e.g. DJ Starlight"
                      className="w-full input-field text-lg font-medium"
                    />
                  </div>

                  {mode === 'join' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2"
                    >
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Access Code</label>
                      <input 
                        type="text" 
                        value={roomCode}
                        onChange={(e) => {
                          setRoomCode(e.target.value);
                          if (error) clearError();
                        }}
                        placeholder="6-DIGIT CODE"
                        className="w-full input-field text-xl font-black uppercase tracking-widest text-brand-primary text-center"
                        maxLength={6}
                      />
                    </motion.div>
                  )}
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-400/10 p-3 rounded-xl border border-red-500/20 text-center font-medium">
                    {error}
                  </p>
                )}

                <button 
                  onClick={mode === 'join' ? handleJoin : handleCreate}
                  disabled={!name.trim() || (mode === 'join' && !roomCode.trim())}
                  className="w-full btn-primary !py-5 text-xl group disabled:opacity-50 disabled:scale-100"
                >
                  {mode === 'join' ? 'Join Session' : 'Get Started'}
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between pt-6 border-t border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              <div className="flex items-center gap-2"><Globe className="w-3 h-3" /> Global Sync</div>
              <div className="flex items-center gap-2"><Laptop className="w-3 h-3" /> All Platforms</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Floating Badge */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-8 text-slate-600 text-xs font-medium tracking-widest"
      >
        BUILT FOR AUDIOPHILES BY MUSICROOM.IO
      </motion.div>
    </main>
  );
}
