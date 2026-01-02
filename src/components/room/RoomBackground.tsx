import { motion, AnimatePresence } from 'framer-motion';

interface RoomBackgroundProps {
  thumbnail?: string;
}

export const RoomBackground = ({ thumbnail }: RoomBackgroundProps) => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={thumbnail || 'default'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute inset-0 z-0 bg-black"
        >
          {thumbnail ? (
            <div 
              className="w-full h-full bg-cover bg-center blur-[120px] saturate-[1.8] brightness-[0.6]"
              style={{ backgroundImage: `url(${thumbnail})` }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-black blur-[120px]" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Animated Mesh Gradients for Color Movement */}
      <div className="absolute inset-0 z-10 opacity-30">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[100%] h-[100%] bg-brand-primary/20 blur-[150px] rounded-full"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-20%] right-[-10%] w-[100%] h-[100%] bg-brand-accent/15 blur-[150px] rounded-full"
        />
      </div>
      
      {/* Grain Texture Overlay */}
      <div className="absolute inset-0 z-20 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
};
