import { motion, AnimatePresence } from 'framer-motion';

interface RoomBackgroundProps {
  thumbnail?: string;
}

export const RoomBackground = ({ thumbnail }: RoomBackgroundProps) => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020205]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={thumbnail || 'default'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 3, ease: "easeInOut" }}
          className="absolute inset-0 z-0"
        >
          {thumbnail ? (
            <div 
              className="w-full h-full bg-cover bg-center blur-[120px] saturate-[2.2] brightness-[0.4]"
              style={{ backgroundImage: `url(${thumbnail})` }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0a0a20] via-[#050510] to-[#000000] blur-[100px]" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dynamic Glow Blobs */}
      <div className="absolute inset-0 z-10 overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, 50, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-brand-primary/20 blur-[150px] rounded-full mix-blend-screen"
        />
        <motion.div 
          animate={{ 
            scale: [1.3, 1, 1.3],
            x: [0, -80, 0],
            y: [0, -60, 0],
            opacity: [0.15, 0.3, 0.15]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-[30%] -right-[15%] w-[90%] h-[90%] bg-brand-accent/20 blur-[180px] rounded-full mix-blend-screen"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.4, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[30%] w-[40%] h-[40%] bg-indigo-500/30 blur-[200px] rounded-full mix-blend-overlay"
        />
      </div>
      
      {/* Soft Vignette and Texture */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
      <div className="absolute inset-0 z-30 opacity-[0.04] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
};
