import React, { useState, useEffect, useRef } from 'react';
import { useRoom } from '@/context/RoomContext';
import { Send, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatList = () => {

    const { chatMessages, sendChat, user } = useRoom();

    const [input, setInput] = useState('');
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


    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-5 py-3 flex justify-between items-center border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Chat</h3>
                    <span className="bg-indigo-500/20 text-indigo-400 text-[9px] px-1.5 py-0.5 rounded font-bold">{chatMessages.length}</span>
                </div>
            </div>


            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                        <MessageCircle className="w-12 h-12 mb-2" />
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
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-4 pb-4 border-t border-white/5 bg-surface-900/50 backdrop-blur-md"
            >

                <div className="flex gap-2 items-center">
                    {/* Text Input */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full bg-surface-800 border-none rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
                        />
                    </div>

                    {/* Send Button */}
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="p-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>


        </div>
    );
};
