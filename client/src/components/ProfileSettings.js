import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, X } from 'lucide-react';
import AvatarUploader from './profile/AvatarUploader';
import FrameSelector from './profile/FrameSelector';
import BiographyEditor from './profile/BiographyEditor';
import UsernameEditor from './profile/UsernameEditor';
import ProfilePreview from './profile/ProfilePreview';
import Toast from './common/Toast';
import useProfileSettings from '../hooks/useProfileSettings';

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;
const RESERVED_USERNAMES = new Set(['admin', 'root', 'support', 'system', 'moderator', 'mod']);
const VALID_FRAMES = new Set(['none', 'neon', 'gold', 'minimal', 'cyberpunk', 'rgb']);
const MAX_BIO_LENGTH = 200;

const ProfileSettingsPage = ({ onBack }) => {
  const { profile, isDirty, isLoading, isSaving, error, setProfile, saveProfile, resetProfile } =
    useProfileSettings();

  const [toasts, setToasts] = useState([]);

  const usernameTrimmed = String(profile.username || '').trim();
  const isUsernameValid =
    !!usernameTrimmed &&
    USERNAME_REGEX.test(usernameTrimmed) &&
    !RESERVED_USERNAMES.has(usernameTrimmed.toLowerCase());

  const isBioValid = String(profile.bio || '').length <= MAX_BIO_LENGTH;

  const isAvatarValid = (() => {
    if (!profile.avatar) return true;
    const avatar = String(profile.avatar);
    return avatar.startsWith('data:image/') || /^https?:\/\//i.test(avatar);
  })();

  const isFrameValid = !profile.frame || VALID_FRAMES.has(profile.frame);
  const isFormValid = isUsernameValid && isBioValid && isAvatarValid && isFrameValid;
  const canSave = isDirty && !isSaving && isFormValid;

  const addToast = (message, type = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleSave = async () => {
    const nextUsername = String(profile.username || '').trim();
    if (!nextUsername) {
      addToast('Username obbligatorio', 'warning');
      return;
    }
    if (!USERNAME_REGEX.test(nextUsername)) {
      addToast('Username non valido (3-30 caratteri: lettere, numeri, _ e -)', 'warning');
      return;
    }
    if (RESERVED_USERNAMES.has(nextUsername.toLowerCase())) {
      addToast('Username non disponibile', 'warning');
      return;
    }
    if (String(profile.bio || '').length > MAX_BIO_LENGTH) {
      addToast(`Biografia troppo lunga (max ${MAX_BIO_LENGTH} caratteri)`, 'warning');
      return;
    }
    if (profile.avatar) {
      const avatar = String(profile.avatar);
      const looksLikeDataUrl = avatar.startsWith('data:image/');
      const looksLikeUrl = /^https?:\/\//i.test(avatar);
      if (!looksLikeDataUrl && !looksLikeUrl) {
        addToast('Immagine profilo non valida', 'warning');
        return;
      }
    }
    if (profile.frame && !VALID_FRAMES.has(profile.frame)) {
      addToast('Cornice selezionata non valida', 'warning');
      return;
    }

    try {
      await saveProfile();
      addToast('Profilo aggiornato con successo!', 'success');
    } catch (err) {
      const msg = err?.error || err?.message;
      addToast(msg ? String(msg) : 'Errore nel salvataggio del profilo', 'error');
    }
  };

  const handleCancel = () => {
    resetProfile();
    addToast('Modifiche annullate', 'info');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[var(--darker-bg)] to-[var(--dark-bg)]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-block"
          >
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-purple-500 rounded-full" />
          </motion.div>
          <p className="mt-4 text-cyan-400">Caricamento profilo...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-[var(--darker-bg)] to-[var(--dark-bg)] pb-12"
    >
      <div className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Indietro</span>
          </motion.button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Impostazioni Profilo
          </h1>
          <div className="w-24" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 card-dark bg-red-900/20 border border-red-700/50">
            <p className="text-red-200 font-semibold">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            <AvatarUploader
              currentAvatar={profile.avatar}
              onAvatarChange={(avatar) => {
                setProfile({ ...profile, avatar });
                addToast(
                  avatar ? 'Immagine pronta (non ancora salvata)' : 'Immagine rimossa (non ancora salvata)',
                  'info'
                );
              }}
              onError={(msg) => addToast(msg, 'error')}
            />

            <UsernameEditor
              username={profile.username}
              onUsernameChange={(username) => setProfile({ ...profile, username })}
              onValidationError={(msg) => addToast(msg, 'warning')}
            />

            <BiographyEditor bio={profile.bio} onBioChange={(bio) => setProfile({ ...profile, bio })} />

            <FrameSelector
              selectedFrame={profile.frame}
              onFrameChange={(frame) => {
                setProfile({ ...profile, frame });
                addToast('Cornice aggiornata (non ancora salvata)', 'info');
              }}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-4 pt-6 border-t border-white/10"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={!canSave}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all duration-300 text-white"
              >
                <Save size={20} />
                {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCancel}
                disabled={isSaving || !isDirty}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed border border-gray-600 rounded-lg font-semibold transition-all duration-300 text-white"
              >
                <X size={20} />
                Annulla
              </motion.button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="sticky top-24 h-fit"
          >
            <ProfilePreview profile={profile} />
          </motion.div>
        </div>
      </div>

      <div className="fixed bottom-8 right-8 z-50 space-y-4">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default ProfileSettingsPage;
