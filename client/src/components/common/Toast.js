import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const Toast = ({ message, type, onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getStyles = () => {
    const styles = {
      success: {
        bg: 'bg-green-900/80',
        border: 'border-green-500/50',
        text: 'text-green-100',
        icon: 'text-green-400',
      },
      error: {
        bg: 'bg-red-900/80',
        border: 'border-red-500/50',
        text: 'text-red-100',
        icon: 'text-red-400',
      },
      warning: {
        bg: 'bg-yellow-900/80',
        border: 'border-yellow-500/50',
        text: 'text-yellow-100',
        icon: 'text-yellow-400',
      },
      info: {
        bg: 'bg-blue-900/80',
        border: 'border-blue-500/50',
        text: 'text-blue-100',
        icon: 'text-blue-400',
      },
    };

    return styles[type];
  };

  const getIcon = () => {
    const icons = {
      success: <CheckCircle size={20} />,
      error: <AlertCircle size={20} />,
      warning: <AlertTriangle size={20} />,
      info: <Info size={20} />,
    };

    return icons[type];
  };

  const styles = getStyles();

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 100, y: 20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md max-w-sm ${styles.bg} ${styles.border}`}
    >
      <div className={`flex-shrink-0 ${styles.icon}`}>{getIcon()}</div>

      <p className={`flex-1 text-sm font-medium ${styles.text}`}>{message}</p>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className={`flex-shrink-0 ${styles.icon} hover:opacity-80 transition-opacity`}
      >
        <X size={16} />
      </motion.button>

      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-0.5 ${
          type === 'success'
            ? 'bg-green-400'
            : type === 'error'
            ? 'bg-red-400'
            : type === 'warning'
            ? 'bg-yellow-400'
            : 'bg-blue-400'
        } origin-left rounded-b-lg`}
        style={{ transformOrigin: 'left' }}
      />
    </motion.div>
  );
};

export default Toast;
