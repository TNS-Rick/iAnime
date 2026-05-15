import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const DEFAULT_PROFILE = {
  username: '',
  bio: '',
  avatar: null,
  frame: 'none',
};

const useProfileSettings = () => {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [originalProfile, setOriginalProfile] = useState(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const isDirty =
    profile.username !== originalProfile.username ||
    profile.bio !== originalProfile.bio ||
    profile.avatar !== originalProfile.avatar ||
    profile.frame !== originalProfile.frame;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        authService.getToken();

        let user = authService.getUser();

        try {
          const response = await authService.getCurrentUser();
          user = response?.user || user;
          if (response?.user) {
            authService.setUser(response.user);
          }
        } catch (fetchError) {
          console.warn('getCurrentUser failed, using cached user', fetchError);
        }

        if (!user) {
          setError('Utente non autenticato');
          return;
        }

        const userProfile = {
          username: user.username || '',
          bio: user.bio || '',
          avatar: user.profileImage ?? user.avatar ?? null,
          frame: user.profileFrameStyle ?? user.frame ?? 'none',
        };

        setProfile(userProfile);
        setOriginalProfile(userProfile);
        setError(null);
      } catch (err) {
        setError('Errore nel caricamento del profilo');
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const saveProfile = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);

      authService.getToken();

      const response = await authService.updateProfile({
        username: profile.username,
        bio: profile.bio,
        avatar: profile.avatar ?? '',
        frame: profile.frame,
      });

      const savedUser = response?.user;
      if (!savedUser) {
        throw new Error('Risposta server non valida');
      }

      authService.setUser(savedUser);

      const savedProfile = {
        username: savedUser.username || '',
        bio: savedUser.bio || '',
        avatar: savedUser.profileImage ?? null,
        frame: savedUser.profileFrameStyle ?? 'none',
      };

      setProfile(savedProfile);
      setOriginalProfile(savedProfile);
    } catch (err) {
      setError('Errore nel salvataggio del profilo');
      console.error('Error saving profile:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [profile]);

  const resetProfile = useCallback(() => {
    setProfile(originalProfile);
    setError(null);
  }, [originalProfile]);

  return {
    profile,
    isDirty,
    isLoading,
    isSaving,
    error,
    setProfile,
    saveProfile,
    resetProfile,
  };
};

export default useProfileSettings;
