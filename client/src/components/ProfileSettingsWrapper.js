import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileSettingsPage from './ProfileSettings';

const ProfileSettingsWrapper = () => {
  const navigate = useNavigate();

  return <ProfileSettingsPage onBack={() => navigate(-1)} />;
};

export default ProfileSettingsWrapper;
