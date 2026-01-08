import React, { useState, useEffect, useRef } from 'react';
import { ActivityLog } from '@/types/room';
import {
    UserPlus, UserMinus, Music, Trash2, FastForward, Heart,
    ShieldAlert, Settings, MessageCircle, ListOrdered, Activity, ChevronDown, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityLogPopupProps {
    logs: ActivityLog[];
}

export const ActivityLogPopup: React.FC<ActivityLogPopupProps> = ({ logs }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [lastLogId, setLastLogId] = useState<string | null>(null);
    const [showBadge, setShowBadge] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const latestLog = logs[0];

    useEffect(() => {
        if (logs.length > 0) {
            const uniqueId = logs[0].id; // logs[0] is the newest
            if (uniqueId !== lastLogId) {
                setLastLogId(uniqueId);

                // Always show toast for new activity unless popup is open
                if (!isOpen) {
                    setShowBadge(true);
                    setShowToast(true);

                    const timer = setTimeout(() => setShowToast(false), 5000);
                    return () => clearTimeout(timer);
                }
            }
        }
    }, [logs, isOpen, lastLogId]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'user_join': return <UserPlus className="w-4 h-4 text-green-400" />;
            case 'user_leave': return <UserMinus className="w-4 h-4 text-red-400" />;
            case 'track_add': return <Music className="w-4 h-4 text-blue-400" />;
            case 'track_remove': return <Trash2 className="w-4 h-4 text-orange-400" />;
            case 'track_skip': return <FastForward className="w-4 h-4 text-yellow-400" />;
            case 'track_heart': return <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />;
            case 'admin_transfer': return <ShieldAlert className="w-4 h-4 text-purple-400" />;
            case 'permission_change': return <Settings className="w-4 h-4 text-gray-400" />;
            case 'reaction': return <MessageCircle className="w-4 h-4 text-indigo-400" />;
            case 'queue_reorder': return <ListOrdered className="w-4 h-4 text-cyan-400" />;
            default: return <Activity className="w-4 h-4 text-slate-400" />;
        }
    };

    const formatTime = (timestamp: number) => {
        const diff = Math.floor((Date.now() - timestamp) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none gap-3">

            {/* Toast Notification (New Activity) */}
            <AnimatePresence>
                {showToast && latestLog && !isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="pointer-events-auto bg-surface-900/95 backdrop-blur border border-indigo-500/30 p-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-xs cursor-pointer hover:bg-surface-800 transition-colors"
                        onClick={() => {
                            setIsOpen(true);
                            setShowToast(false);
                            setShowBadge(false);
                        }}
                    >
                        <div className="p-1.5 rounded-full bg-surface-800 shrink-0 border border-white/5">
                            {getIcon(latestLog.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-200 truncate">
                                <span className="font-bold text-indigo-300">{latestLog.userName}</span> {latestLog.message.replace(latestLog.userName || '', '')}
                            </div>
                            <div className="text-[10px] text-slate-500">Click to view details</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Toggle Button */}
            <div
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) {
                        setShowBadge(false);
                        setShowToast(false);
                    }
                }}
                className="pointer-events-auto bg-surface-800/90 backdrop-blur-md border border-white/10 p-3 rounded-full shadow-2xl hover:bg-surface-700 transition cursor-pointer flex items-center gap-2 group relative"
            >
                <Activity className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />
                {showBadge && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-black" />
                )}
            </div>

            {/* Popup Logs List */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="pointer-events-auto w-80 max-h-96 glass-effect rounded-2xl shadow-xl overflow-hidden flex flex-col border border-white/5 order-first mb-2"
                    >
                        <div className="p-3 border-b border-white/5 bg-surface-900/50 flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Activity className="w-3 h-3" /> Activity Log
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="hover:text-white text-slate-500 p-1 rounded-full hover:bg-white/5 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div
                            ref={scrollRef}
                            className="overflow-y-auto p-3 space-y-3 custom-scrollbar"
                        >
                            {logs.length === 0 ? (
                                <div className="text-center py-6 text-slate-500 text-xs italic">
                                    No activity yet
                                </div>
                            ) : (
                                logs.map((log) => (
                                    <div key={log.id} className="flex gap-3 items-start group">
                                        <div className="mt-1 p-1.5 rounded-full bg-surface-800 border border-white/5 shrink-0 group-hover:border-indigo-500/30 transition-colors">
                                            {getIcon(log.type)}
                                        </div>
                                        <div className="flex-1 space-y-0.5 min-w-0">
                                            <div className="text-xs text-slate-300 leading-snug break-words">
                                                <span className="font-bold text-indigo-300">{log.userName}</span> {log.message.replace(log.userName || '', '')}
                                            </div>
                                            <div className="text-[10px] text-slate-600 font-medium">
                                                {formatTime(log.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
