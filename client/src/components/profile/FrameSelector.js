import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const FRAMES = [
  {
    id: 'none',
    name: 'Nessuna',
    description: 'Profilo semplice',
    color: 'bg-gray-700',
    borderStyle: 'border-gray-600',
    glow: '',
    gradient: '',
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Effetto neon brillante',
    color: 'bg-cyan-500/20',
    borderStyle: 'border-cyan-400',
    glow: 'shadow-lg shadow-cyan-500/50',
    gradient: 'from-cyan-400 to-cyan-600',
  },
  {
    id: 'gold',
    name: 'Gold Premium',
    description: 'Stile premium dorato',
    color: 'bg-yellow-500/20',
    borderStyle: 'border-yellow-400',
    glow: 'shadow-lg shadow-yellow-500/50',
    gradient: 'from-yellow-400 via-yellow-500 to-orange-400',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Design pulito e moderno',
    color: 'bg-white/10',
    borderStyle: 'border-white/30',
    glow: '',
    gradient: 'from-white/40 to-white/20',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Stile futuristico',
    color: 'bg-pink-500/20',
    borderStyle: 'border-pink-500',
    glow: 'shadow-lg shadow-pink-500/50',
    gradient: 'from-pink-500 via-purple-500 to-cyan-500',
  },
  {
    id: 'rgb',
    name: 'RGB Gaming',
    description: 'Effetto RGB multicolore',
    color: 'bg-gradient-to-r from-red-500/20 via-green-500/20 to-blue-500/20',
    borderStyle: 'border-red-500',
    glow: 'shadow-lg shadow-red-500/50',
    gradient: 'from-red-500 via-green-500 to-blue-500',
  },
];

const FrameSelector = ({ selectedFrame, onFrameChange }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-dark bg-gray-800 border-gray-700"
    >
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Sparkles className="text-cyan-400" size={24} />
        Cornice Profilo
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FRAMES.map((frame, index) => (
          <motion.button
            key={frame.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onFrameChange(frame.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
              selectedFrame === frame.id
                ? 'border-cyan-400 bg-cyan-400/10 ring-2 ring-cyan-400/50'
                : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
            }`}
          >
            <div className="mb-3">
              <div className="relative inline-block">
                <div
                  className={`w-16 h-16 rounded-lg ${frame.borderStyle} border-2 ${
                    frame.glow
                  } ${frame.color} flex items-center justify-center text-gray-400`}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-md" />
                </div>

                {frame.id !== 'none' && frame.id !== 'minimal' && (
                  <motion.div
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`absolute inset-0 rounded-lg border-2 ${frame.borderStyle}`}
                  />
                )}
              </div>
            </div>

            <div className="text-left">
              <h3 className="font-semibold text-white text-sm">{frame.name}</h3>
              <p className="text-xs text-gray-400 mt-1">{frame.description}</p>
            </div>

            {selectedFrame === frame.id && (
              <motion.div layoutId="frameSelect" className="absolute top-2 right-2">
                <div className="w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-cyan-900 rounded-full" />
                </div>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg"
      >
        <p className="text-sm text-purple-300">{FRAMES.find((f) => f.id === selectedFrame)?.description}</p>
        <p className="text-xs text-purple-400 mt-2">✨ La cornice selezionata sarà visibile nel tuo profilo pubblico</p>
      </motion.div>
    </motion.div>
  );
};

export default FrameSelector;
