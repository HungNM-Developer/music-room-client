import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Zap, Heart, Disc } from 'lucide-react';
import { useRoom } from '@/context/RoomContext';

export const DJSoundboard = () => {
    const { user, triggerDjSound } = useRoom();
    const [cooldown, setCooldown] = useState(false);

    if (!user?.canDj && user?.role !== 'admin') return null;

    const sounds = [
        { id: 'build', label: 'BUILD 🔥', color: 'from-orange-500 to-red-500' },
        { id: 'drop', label: 'DROP 💥', color: 'from-purple-600 to-indigo-600' },
        { id: 'clap', label: 'CLAP 👏', color: 'from-yellow-400 to-orange-400' },
        { id: 'horn', label: 'HORN 📣', color: 'from-blue-500 to-cyan-500' },

    ] as const;

    const handleTrigger = (id: 'build' | 'drop' | 'clap' | 'horn') => {
        if (cooldown) return;
        
        triggerDjSound(id as any);
        setCooldown(true);
        setTimeout(() => setCooldown(false), 1500);
    };



    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect rounded-[2rem] p-6 shadow-2xl border border-white/10"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                    <Disc className="w-5 h-5 text-indigo-400 animate-spin-slow" />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">DJ Soundboard</h3>
                    <p className="text-[10px] text-indigo-300/60 font-medium uppercase tracking-widest">MVP Edition</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">



                {sounds.map((sound) => (
                    <button
                        key={sound.id}
                        onClick={() => handleTrigger(sound.id)}
                        disabled={cooldown}
                        className={`group relative overflow-hidden p-4 rounded-2xl border border-white/5 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale`}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${sound.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                        <div className="relative z-10 flex flex-col items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-white group-hover:text-white/100 transition-colors">
                                {sound.label}
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            {cooldown && (
                <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 1.5, ease: "linear" }}
                        className="h-full bg-indigo-500"
                    />
                </div>
            )}
        </motion.div>
    );
};
