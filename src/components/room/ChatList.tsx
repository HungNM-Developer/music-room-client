import React, { useState, useEffect, useRef } from 'react';
import { useRoom } from '@/context/RoomContext';
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatList = () => {
    const { chatMessages, sendChat, user, toggleTTS, isTTSEnabled } = useRoom();
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSend = () => {
        if (!input.trim()) return;
        sendChat(input);
        setInput('');
    };

    const startListening = () => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'vi-VN'; // Default to Vietnamese based on user language

            recognition.onstart = () => setIsListening(true);

            recognition.onend = () => setIsListening(false);

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(prev => (prev ? prev + ' ' : '') + transcript);
            };

            recognition.start();
        } else {
            alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói (Chỉ hỗ trợ Chrome/Edge/Safari).");
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-5 py-3 flex justify-between items-center border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Chat</h3>
                    <span className="bg-indigo-500/20 text-indigo-400 text-[9px] px-1.5 py-0.5 rounded font-bold">{chatMessages.length}</span>
                </div>
                <button
                    onClick={toggleTTS}
                    className={`p-1.5 rounded-lg transition-colors ${isTTSEnabled ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    title={isTTSEnabled ? "Auto-read Messages" : "Mute Auto-read"}
                >
                    {isTTSEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                        <Mic className="w-12 h-12 mb-2" />
                        <p className="text-xs uppercase tracking-widest">No messages yet</p>
                        <p className="text-[10px]">Start the conversation!</p>
                    </div>
                ) : (
                    chatMessages.map((msg) => {
                        const isMe = msg.userId === user?.userId;
                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${isMe
                                    ? 'bg-indigo-500 text-white rounded-br-none'
                                    : 'bg-surface-800 text-slate-200 rounded-bl-none border border-white/5'
                                    }`}>
                                    {!isMe && <div className="text-[10px] text-indigo-300 font-bold mb-1 opacity-75">{msg.userName}</div>}
                                    <div className="leading-relaxed">{msg.content}</div>
                                </div>
                                <div className="text-[9px] text-slate-600 mt-1 px-1">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-surface-900/50 backdrop-blur-md">
                <div className="flex gap-2 items-center">
                    {/* Mic Button */}
                    <button
                        onClick={startListening}
                        disabled={isListening}
                        className={`p-3 rounded-xl transition-all relative group ${isListening
                            ? 'bg-red-500/20 text-red-500 ring-2 ring-red-500 ring-offset-2 ring-offset-black'
                            : 'bg-surface-800 hover:bg-surface-700 text-slate-400 hover:text-indigo-400'
                            }`}
                    >
                        {isListening ? (
                            <>
                                <span className="absolute inset-0 rounded-xl animate-ping bg-red-500/30"></span>
                                <Mic className="w-5 h-5 relative z-10" />
                            </>
                        ) : (
                            <Mic className="w-5 h-5" />
                        )}
                    </button>

                    {/* Text Input */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={isListening ? "Listening..." : "Type or speak..."}
                            className="w-full bg-surface-800 border-none rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
                            disabled={isListening}
                        />
                    </div>

                    {/* Send Button */}
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="p-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
