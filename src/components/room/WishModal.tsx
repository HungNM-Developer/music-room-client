import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Radio } from 'lucide-react';
import { Track, VoicePreset } from '@/types/room';

interface WishModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  wishInput: string;
  setWishInput: (val: string) => void;
  voicePreset: VoicePreset;
  setVoicePreset: (preset: VoicePreset) => void;
  onSave: () => void;
}

const VOICE_PRESETS: { id: VoicePreset; label: string; icon: string; description: string }[] = [
  { id: 'radio', label: 'Radio MC', icon: '📻', description: 'MC chuyên nghiệp' },
  { id: 'drama', label: 'Drama Queen', icon: '🎭', description: 'Kịch tính quá đà' },
  { id: 'baby', label: 'Baby', icon: '👶', description: 'Em bé tập nói' },
  { id: 'panic', label: 'Panic', icon: '🤯', description: 'Hoảng sợ cực độ' },
  { id: 'chipmunk', label: 'Chipmunk', icon: '🐿️', description: 'Giọng sóc siêu hài' },
  { id: 'sleepy', label: 'Sleepy', icon: '😴', description: 'Buồn ngủ mệt mỏi' },
];


export const WishModal = ({
  isOpen,
  onClose,
  track,
  wishInput,
  setWishInput,
  voicePreset,
  setVoicePreset,
  onSave
}: WishModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg max-h-[85vh] glass-effect rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col"
          >
            {/* Background Decor */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand-accent/10 rounded-full blur-3xl" />

            {/* Scrollable Content */}
            <div className="relative z-10 overflow-y-auto p-8 flex-1">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-accent rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-widest text-white">Gửi lời chúc</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Custom Dedication</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-white/[0.03] rounded-2xl p-4 mb-6 border border-white/5">
                <div className="flex gap-4 items-center">
                  <img 
                    src={track?.thumbnail || ''} 
                    alt="" 
                    className="w-20 h-12 object-cover rounded-lg ring-1 ring-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">Đang chọn Music</p>
                    <p className="text-xs font-bold text-white truncate">{track?.title}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-4 leading-relaxed font-medium px-1">
                Lời chúc của bạn sẽ được hệ thống đọc tự động bằng giọng nói (TTS) ngay khi bài hát này bắt đầu được phát trong phòng.
              </p>

              <div className="relative mb-6">
                <textarea
                  autoFocus
                  value={wishInput}
                  onChange={(e) => setWishInput(e.target.value)}
                  placeholder="Ví dụ: Chúc mừng sinh nhật nhé!..."
                  className="w-full h-32 bg-white/[0.02] border border-white/10 rounded-3xl p-6 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all resize-none"
                />
              </div>

              {/* Voice Preset Selector */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Radio className="w-4 h-4 text-brand-primary" />
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn giọng đọc</h4>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {VOICE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setVoicePreset(preset.id)}
                      className={`relative p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                        voicePreset === preset.id
                          ? 'bg-brand-primary/20 border-brand-primary/50 ring-2 ring-brand-primary/30'
                          : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
                      }`}
                    >
                      <span className="text-2xl">{preset.icon}</span>
                      <div className="text-center">
                        <p className={`text-[9px] font-black uppercase tracking-wider ${
                          voicePreset === preset.id ? 'text-brand-primary' : 'text-slate-400'
                        }`}>
                          {preset.label}
                        </p>
                        <p className="text-[8px] text-slate-500 mt-0.5 leading-tight">{preset.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={onSave}
                disabled={!wishInput.trim()}
                className="w-full py-5 bg-gradient-to-r from-brand-primary to-brand-accent hover:scale-[1.02] active:scale-[0.98] text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-brand-primary/30 disabled:opacity-50 disabled:grayscale disabled:scale-100"
              >
                <Send className="w-4 h-4" /> Lưu lời chúc của bạn
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


