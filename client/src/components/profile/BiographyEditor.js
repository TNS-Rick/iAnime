import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

const MAX_BIO_LENGTH = 200;

const BiographyEditor = ({ bio, onBioChange }) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (value) => {
    if (value.length <= MAX_BIO_LENGTH) {
      onBioChange(value);
    }
  };

  const remainingChars = MAX_BIO_LENGTH - String(bio || '').length;
  const getColorClass = () => {
    if (remainingChars > 50) return 'text-green-400';
    if (remainingChars > 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-dark bg-gray-800 border-gray-700"
    >
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <MessageCircle className="text-cyan-400" size={24} />
        Biografia
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">La Tua Storia</label>

          <div
            className={`relative rounded-lg border-2 transition-all duration-300 ${
              isFocused
                ? 'border-cyan-400 bg-gray-900/80 ring-2 ring-cyan-400/30'
                : 'border-gray-700 bg-gray-900/50'
            }`}
          >
            <textarea
              value={bio}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Racconta qualcosa di te... (massimo 200 caratteri)"
              maxLength={MAX_BIO_LENGTH}
              rows={4}
              className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none resize-none"
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-sm font-semibold ${getColorClass()}`}
            >
              <span className="font-bold">{remainingChars}</span>
              <span className="text-gray-400"> / {MAX_BIO_LENGTH} caratteri</span>
            </motion.div>

            {String(bio || '').length > 0 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                className="h-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
                style={{ width: `${(String(bio || '').length / MAX_BIO_LENGTH) * 100}px` }}
              />
            )}
          </div>
        </div>

        <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-purple-300 text-sm">💡 Suggerimenti:</h3>
          <ul className="text-xs text-purple-300/80 space-y-1 list-disc list-inside">
            <li>Aggiungi i tuoi anime preferiti</li>
            <li>Menziona i tuoi hobby</li>
            <li>Condividi cosa ti entusiasma</li>
          </ul>
        </div>

        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-400 mb-2">ANTEPRIMA</p>
          <p className="text-gray-300 italic text-sm">
            {bio || <span className="text-gray-500">La tua biografia apparirà qui...</span>}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default BiographyEditor;
