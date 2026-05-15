import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, AlertCircle } from 'lucide-react';

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;
const RESERVED_USERNAMES = ['admin', 'root', 'system', 'moderator', 'support', 'mod'];

const UsernameEditor = ({ username, onUsernameChange, onValidationError }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const lastNotified = useRef('');

  const usernameTrimmed = String(username || '').trim();
  const isEmpty = usernameTrimmed.length === 0;
  const isReserved = RESERVED_USERNAMES.includes(usernameTrimmed.toLowerCase());
  const isFormatValid = USERNAME_REGEX.test(usernameTrimmed);
  const isValid = !isEmpty && !isReserved && isFormatValid;

  useEffect(() => {
    if (isEmpty) {
      setValidationMessage('Username obbligatorio');
      return;
    }

    if (!isFormatValid) {
      setValidationMessage('3-30 caratteri: lettere, numeri, underscore, trattino');
      return;
    }

    if (isReserved) {
      setValidationMessage('Questo username è riservato');
      return;
    }

    setValidationMessage('Formato valido');
  }, [isEmpty, isFormatValid, isReserved]);

  const handleChange = (value) => {
    onUsernameChange(value);
  };

  const getInputBorderColor = () => {
    if (!usernameTrimmed) return 'border-red-500';
    if (isValid) return 'border-green-500';
    return 'border-red-500';
  };

  const getStatusIcon = () => {
    if (isValid) return null;
    return <AlertCircle size={20} className="text-red-500" />;
  };

  const notifyIfNeeded = () => {
    if (isValid) return;
    const msg = validationMessage || 'Username non valido';
    if (lastNotified.current === msg) return;
    lastNotified.current = msg;
    onValidationError(msg);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-dark bg-gray-800 border-gray-700"
    >
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <User className="text-cyan-400" size={24} />
        Username
      </h2>

      <div className="space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-300 mb-2">Nome Utente</label>

          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
                notifyIfNeeded();
              }}
              placeholder="es. giorno_anime"
              className={`w-full input-dark bg-gray-900 border-2 ${getInputBorderColor()} pr-10 transition-all duration-300 ${
                isFocused ? 'ring-2 ring-cyan-400/30' : ''
              }`}
              maxLength={30}
            />

            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">{getStatusIcon()}</div>
          </div>

          <div className="mt-2 flex items-start gap-2">
            {validationMessage && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-sm ${isValid ? 'text-green-400' : 'text-red-400'}`}
              >
                {validationMessage}
              </motion.p>
            )}
          </div>

          <div className="mt-2 text-xs text-gray-500">{String(username || '').length}/30 caratteri</div>
        </div>

        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 text-sm text-blue-300">
          <p>
            Lo username deve contenere 3-30 caratteri. Sono permessi solo lettere, numeri, underscore e
            trattini.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default UsernameEditor;
