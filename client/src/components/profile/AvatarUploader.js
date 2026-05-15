import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const AvatarUploader = ({ currentAvatar, onAvatarChange, onError }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(currentAvatar);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSize = 512;

          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          try {
            resolve(canvas.toDataURL('image/webp', 0.85));
          } catch {
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          }
        };

        img.onerror = () => reject(new Error("Errore nel caricamento dell'immagine"));
        img.src = e.target?.result;
      };

      reader.onerror = () => reject(new Error('Errore nella lettura del file'));
      reader.readAsDataURL(file);
    });
  };

  const validateAndProcessFile = async (file) => {
    if (!ALLOWED_FORMATS.includes(file.type)) {
      onError('Formato immagine non supportato. Usa JPEG, PNG, WebP o GIF.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      onError('File troppo grande. Massimo 5MB.');
      return;
    }

    try {
      setIsCompressing(true);
      if (file.type === 'image/gif') {
        const reader = new FileReader();
        const dataUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Errore nella lettura del file'));
          reader.readAsDataURL(file);
        });

        setPreview(dataUrl);
        onAvatarChange(dataUrl);
      } else {
        const compressed = await compressImage(file);
        setPreview(compressed);
        onAvatarChange(compressed);
      }
    } catch (error) {
      onError("Errore nel processing dell'immagine");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onAvatarChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-dark bg-gray-800 border-gray-700"
    >
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <ImageIcon className="text-cyan-400" size={24} />
        Immagine Profilo
      </h2>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? 'border-cyan-400 bg-cyan-400/10'
                : 'border-gray-600 bg-gray-900/50 hover:border-gray-500'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isCompressing}
              className="hidden"
            />

            <motion.div
              animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div animate={{ y: isDragging ? -5 : 0 }} transition={{ duration: 0.2 }}>
                <Upload
                  size={32}
                  className={`mx-auto transition-colors ${
                    isDragging ? 'text-cyan-400' : 'text-gray-400'
                  }`}
                />
              </motion.div>

              <div>
                <p className="text-white font-semibold">
                  {isCompressing ? 'Elaborazione immagine...' : "Trascina l'immagine qui o clicca"}
                </p>
                <p className="text-sm text-gray-400 mt-1">JPEG, PNG, WebP, GIF - Max 5MB</p>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="relative w-40 h-40">
            {preview ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full h-full rounded-xl overflow-hidden border-2 border-cyan-400/30"
              >
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full rounded-xl border-2 border-dashed border-gray-600 flex items-center justify-center bg-gray-900/50"
              >
                <ImageIcon size={48} className="text-gray-600" />
              </motion.div>
            )}
          </div>

          {preview && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRemove}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-white transition-colors"
            >
              <X size={18} />
              Rimuovi
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AvatarUploader;
