import { motion } from 'framer-motion';

export const PlayingVisualizer = () => (
  <div className="flex items-end gap-[2px] h-3 mb-0.5">
    {[...Array(3)].map((_, i) => (
      <motion.div
        key={i}
        className="w-1 bg-green-400 rounded-t-sm"
        animate={{
          height: [4, 12, 4],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          repeatType: "reverse",
          delay: i * 0.1,
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);
