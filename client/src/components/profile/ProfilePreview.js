import React from 'react';
import { motion } from 'framer-motion';

const ProfilePreview = ({ profile }) => {
  const getFrameStyles = () => {
    const styles = {
      none: { border: 'border-gray-600', glow: '', bg: 'bg-gray-900' },
      neon: {
        border: 'border-cyan-400',
        glow: 'shadow-lg shadow-cyan-500/50',
        bg: 'bg-cyan-500/10',
      },
      gold: {
        border: 'border-yellow-400',
        glow: 'shadow-lg shadow-yellow-500/50',
        bg: 'bg-yellow-500/10',
      },
      minimal: { border: 'border-white/30', glow: '', bg: 'bg-white/5' },
      cyberpunk: {
        border: 'border-pink-500',
        glow: 'shadow-lg shadow-pink-500/50',
        bg: 'bg-pink-500/10',
      },
      rgb: {
        border: 'border-red-500',
        glow: 'shadow-lg shadow-red-500/50',
        bg: 'bg-gradient-to-br from-red-500/10 via-green-500/10 to-blue-500/10',
      },
    };

    return styles[profile.frame] || styles.none;
  };

  const frameStyles = getFrameStyles();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card-dark bg-gray-800 border-gray-700 overflow-hidden"
    >
      <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 -m-6 mb-6 p-6 pb-12">
        <h3 className="text-lg font-bold text-white">Anteprima Profilo</h3>
        <p className="text-sm text-gray-400 mt-1">Così apparirà agli altri utenti</p>
      </div>

      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className={`rounded-2xl border-4 p-6 space-y-4 ${frameStyles.border} ${frameStyles.bg} ${frameStyles.glow}`}
      >
        <div className="flex justify-center">
          <motion.div whileHover={{ scale: 1.05 }} className="relative">
            {profile.avatar ? (
              <motion.img
                src={profile.avatar}
                alt="Avatar"
                layoutId="avatar-preview"
                className={`w-24 h-24 rounded-full object-cover border-4 ${frameStyles.border}`}
              />
            ) : (
              <motion.div
                layoutId="avatar-preview"
                className={`w-24 h-24 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 border-4 ${frameStyles.border} flex items-center justify-center`}
              >
                <span className="text-2xl">👤</span>
              </motion.div>
            )}

            <motion.div
              animate={{ scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <h2 className="text-xl font-bold text-white">{profile.username || 'Nome Utente'}</h2>
          <p className="text-xs text-cyan-400 mt-1">@{profile.username || 'username'}</p>
        </motion.div>

        {profile.bio && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center text-sm text-gray-300 italic border-t border-white/10 pt-4"
          >
            "{profile.bio}"
          </motion.p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-center text-xs text-gray-400"
      >
        <p>
          ✨ Cornice attiva: <span className="font-semibold text-cyan-400 capitalize">{profile.frame}</span>
        </p>
      </motion.div>
    </motion.div>
  );
};

export default ProfilePreview;
