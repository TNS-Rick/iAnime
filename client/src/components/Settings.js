import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

export default function Settings() {
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const currentUser = authService.getUser() || {};
  const [activeTab, setActiveTab] = useState('account');
  const [activeSubTab, setActiveSubTab] = useState('general');
  
  // Account Settings
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState('app');
  const [whoCanInvite, setWhoCanInvite] = useState('all');
  const [acceptStrangerMessages, setAcceptStrangerMessages] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  
  // App Settings
  const [theme, setTheme] = useState('dark');
  const [displayMode, setDisplayMode] = useState('dark');
  const [mentionNotifications, setMentionNotifications] = useState(true);
  const [friendRequestNotifications, setFriendRequestNotifications] = useState(true);
  const [systemNotifications, setSystemNotifications] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [colorBlindMode, setColorBlindMode] = useState('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [textSize, setTextSize] = useState(1);
  const [inputDevice, setInputDevice] = useState('default');
  const [outputDevice, setOutputDevice] = useState('default');
  const [volume, setVolume] = useState(100);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load settings from current user profile
  useEffect(() => {
    if (currentUser) {
      setEmail(currentUser.email || '');
      setTwoFAEnabled(currentUser.twoFAEnabled || false);
      setTwoFAMethod(currentUser.twoFAMethod || 'app');
      setWhoCanInvite(currentUser.whoCanInvite || 'all');
      setAcceptStrangerMessages(currentUser.acceptStrangerMessages !== false);
      setIsPremium(currentUser.isPremium || false);
      setPaymentMethod(currentUser.billingMethod || '');
      setTheme(currentUser.theme || 'dark');
      setDisplayMode(currentUser.displayMode || 'dark');
      setColorBlindMode(currentUser.colorblindMode || 'normal');
      setHighContrast(currentUser.highContrast || false);
      setTextSize(currentUser.textSize || 1);
      setInputDevice(currentUser.audioInputDevice || 'default');
      setOutputDevice(currentUser.audioOutputDevice || 'default');
      setVolume(currentUser.volume || 100);
    }
  }, []);

  const refreshCurrentUser = async () => {
    try {
      authService.getToken();
      const response = await authService.getCurrentUser();
      if (response?.user) {
        authService.setUser(response.user);
        setTwoFAEnabled(response.user.twoFAEnabled || false);
        setTwoFAMethod(response.user.twoFAMethod || 'app');
      }
    } catch (error) {
      console.error('Unable to refresh current user:', error);
    }
  };

  // Save settings to API
  const saveSettings = async () => {
    try {
      const response = await fetch('/api/v1/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          theme,
          displayMode,
          whoCanInvite,
          acceptStrangerMessages,
          colorblindMode: colorBlindMode,
          highContrast,
          textSize,
          audioInputDevice: inputDevice,
          audioOutputDevice: outputDevice,
          volume,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Errore nel salvataggio delle impostazioni');
      }

      setSuccessMessage('✅ Impostazioni salvate con successo!');
      setTimeout(() => setSuccessMessage(''), 3000);
      await refreshCurrentUser();
    } catch (error) {
      setErrorMessage('❌ ' + error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleChangeEmail = async () => {
    if (!twoFAEnabled) {
      setErrorMessage('❌ Attiva il 2FA prima di cambiare l\'email');
      return;
    }
    
    try {
      const response = await fetch('/api/v1/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Errore nel cambio email');
      }

      setSuccessMessage('✅ Email aggiornata! Controlla la tua posta per la conferma.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('❌ ' + error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (!twoFAEnabled) {
      setErrorMessage('❌ Attiva il 2FA prima di cambiare la password');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('❌ La password deve avere almeno 8 caratteri');
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: password,
          newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Errore nel cambio password');
      }

      setPassword('');
      setNewPassword('');
      setSuccessMessage('✅ Password aggiornata con successo!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('❌ ' + error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('⚠️ Sei sicuro di voler eliminare il tuo account? Questa azione non può essere annullata.');
    if (confirmed) {
      try {
        // In a real scenario, you would call a dedicated delete endpoint
        alert('📧 Un\'email di conferma è stata inviata al tuo indirizzo email.');
      } catch (error) {
        setErrorMessage('❌ ' + error.message);
      }
    }
  };

  const handlePremiumPurchase = () => {
    if (!paymentMethod) {
      setErrorMessage('❌ Aggiungi un metodo di pagamento prima di acquistare Premium');
      return;
    }
    setIsPremium(true);
    saveSettings();
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Indietro</button>
        <h1>⚙️ Impostazioni</h1>
      </div>

      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

      <div className="settings-layout">
        {/* Sidebar Navigation */}
        <div className="settings-sidebar">
          <div className="settings-section">
            <h3>Account</h3>
            <button 
              className={`settings-link ${activeTab === 'account' && activeSubTab === 'general' ? 'active' : ''}`}
              onClick={() => { setActiveTab('account'); setActiveSubTab('general'); }}
            >
              Generale
            </button>
            <button 
              className={`settings-link ${activeTab === 'account' && activeSubTab === 'privacy' ? 'active' : ''}`}
              onClick={() => { setActiveTab('account'); setActiveSubTab('privacy'); }}
            >
              Privacy e Sicurezza
            </button>
            <button 
              className={`settings-link ${activeTab === 'account' && activeSubTab === 'premium' ? 'active' : ''}`}
              onClick={() => { setActiveTab('account'); setActiveSubTab('premium'); }}
            >
              Premium
            </button>
          </div>

          <div className="settings-section">
            <h3>Applicazione</h3>
            <button 
              className={`settings-link ${activeTab === 'app' && activeSubTab === 'personalization' ? 'active' : ''}`}
              onClick={() => { setActiveTab('app'); setActiveSubTab('personalization'); }}
            >
              Personalizzazione
            </button>
            <button 
              className={`settings-link ${activeTab === 'app' && activeSubTab === 'notifications' ? 'active' : ''}`}
              onClick={() => { setActiveTab('app'); setActiveSubTab('notifications'); }}
            >
              Notifiche
            </button>
            <button 
              className={`settings-link ${activeTab === 'app' && activeSubTab === 'accessibility' ? 'active' : ''}`}
              onClick={() => { setActiveTab('app'); setActiveSubTab('accessibility'); }}
            >
              Accessibilità
            </button>
            <button 
              className={`settings-link ${activeTab === 'app' && activeSubTab === 'audio' ? 'active' : ''}`}
              onClick={() => { setActiveTab('app'); setActiveSubTab('audio'); }}
            >
              Audio
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="settings-content">
          {/* ========== ACCOUNT SETTINGS ========== */}
          {activeTab === 'account' && activeSubTab === 'general' && (
            <div className="settings-panel">
              <h2>📧 Impostazioni Generali</h2>
              
              <div className="setting-group">
                <label>Email</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
                <small className="text-muted">Richiede 2FA attivato</small>
                <button className="btn btn-primary mt-2" onClick={handleChangeEmail}>
                  Cambia Email
                </button>
              </div>

              <div className="setting-group">
                <label>Password Attuale</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled
                />
              </div>

              <div className="setting-group">
                <label>Nuova Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 caratteri"
                />
                <small className="text-muted">Richiede 2FA attivato</small>
                <button className="btn btn-primary mt-2" onClick={handleChangePassword}>
                  Cambia Password
                </button>
              </div>

              <div className="setting-group danger-zone">
                <h3 style={{color: '#ff006e'}}>🚨 Zona Pericolosa</h3>
                <label>Elimina Account</label>
                <p className="text-muted">Una volta eliminato, il tuo account non può essere recuperato.</p>
                <button className="btn btn-danger" onClick={handleDeleteAccount}>
                  Elimina Account
                </button>
              </div>

              <button className="btn btn-primary save-btn" onClick={saveSettings}>
                💾 Salva Impostazioni
              </button>
            </div>
          )}

          {activeTab === 'account' && activeSubTab === 'privacy' && (
            <div className="settings-panel">
              <h2>🔒 Privacy e Sicurezza</h2>
              
              <div className="setting-group">
                <label>Autenticazione a Due Fattori (2FA)</label>
                <p className="text-muted">
                  Usa un'app autenticatore per generare codici temporanei di accesso.
                </p>
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate('/settings/2fa')}
                  >
                    🔐 Apri Setup 2FA
                  </button>
                </div>

                {twoFAEnabled && (
                  <small className="text-muted d-block mt-2">
                    Stato: attivo con metodo {twoFAMethod === 'app' ? 'app autenticatore' : twoFAMethod}
                  </small>
                )}
              </div>

              <div className="setting-group">
                <label>Chi può invitarti nelle Community</label>
                <select 
                  className="form-control"
                  value={whoCanInvite}
                  onChange={(e) => setWhoCanInvite(e.target.value)}
                >
                  <option value="all">👥 Tutti</option>
                  <option value="friends">👫 Solo Amici</option>
                  <option value="normal">🚫 Nessuno</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Messaggi da Sconosciuti</label>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={acceptStrangerMessages}
                    onChange={(e) => setAcceptStrangerMessages(e.target.checked)}
                  />
                  Accetta messaggi da sconosciuti
                </label>
              </div>

              <button className="btn btn-primary save-btn" onClick={saveSettings}>
                💾 Salva Impostazioni
              </button>
            </div>
          )}

          {activeTab === 'account' && activeSubTab === 'premium' && (
            <div className="settings-panel">
              <h2>⭐ Premium</h2>
              
              <div className="premium-card">
                <h3>Premium Membership</h3>
                <p className="price">💰 $5.99/mese</p>
                <p className="status">
                  {isPremium ? (
                    <span style={{color: '#00d4ff'}}>✅ Attivo</span>
                  ) : (
                    <span style={{color: '#ff006e'}}>❌ Non Attivo</span>
                  )}
                </p>
              </div>

              <div className="setting-group">
                <label>Metodo di Pagamento</label>
                <select 
                  className="form-control"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="">Nessuno selezionato</option>
                  <option value="credit">💳 Carta di Credito</option>
                  <option value="debit">🏦 Carta Debito</option>
                  <option value="prepaid">💵 Prepagata</option>
                  <option value="paypal">₰ PayPal</option>
                </select>
                {paymentMethod && (
                  <input 
                    type="text" 
                    className="form-control mt-2"
                    placeholder="Ultimi 4 numeri: ••••"
                  />
                )}
              </div>

              {!isPremium ? (
                <button className="btn btn-primary save-btn" onClick={handlePremiumPurchase}>
                  🎁 Acquista Premium - $5.99/mese
                </button>
              ) : (
                <button className="btn btn-secondary save-btn">
                  ✅ Abbonamento Attivo
                </button>
              )}
            </div>
          )}

          {/* ========== APP SETTINGS ========== */}
          {activeTab === 'app' && activeSubTab === 'personalization' && (
            <div className="settings-panel">
              <h2>🎨 Personalizzazione</h2>
              
              <div className="setting-group">
                <label>Tema</label>
                <div className="theme-selector">
                  <button 
                    className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    🌙 Dark (Predefinito)
                  </button>
                  <button 
                    className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    ☀️ Light
                  </button>
                  <button 
                    className={`theme-btn ${theme === 'cyber' ? 'active' : ''}`}
                    onClick={() => setTheme('cyber')}
                  >
                    ⚡ Cyber (Premium)
                  </button>
                  <button 
                    className={`theme-btn ${theme === 'ocean' ? 'active' : ''}`}
                    onClick={() => setTheme('ocean')}
                  >
                    🌊 Ocean (Premium)
                  </button>
                </div>
              </div>

              <div className="setting-group">
                <label>Modalità Visualizzazione</label>
                <select 
                  className="form-control"
                  value={displayMode}
                  onChange={(e) => setDisplayMode(e.target.value)}
                >
                  <option value="dark">🌙 Scuro</option>
                  <option value="light">☀️ Chiaro</option>
                  <option value="auto">🔄 Automatico</option>
                </select>
              </div>

              <button className="btn btn-primary save-btn" onClick={saveSettings}>
                💾 Salva Impostazioni
              </button>
            </div>
          )}

          {activeTab === 'app' && activeSubTab === 'notifications' && (
            <div className="settings-panel">
              <h2>🔔 Notifiche</h2>
              
              <div className="setting-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={mentionNotifications}
                    onChange={(e) => setMentionNotifications(e.target.checked)}
                  />
                  Menzioni in Community
                </label>
              </div>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={friendRequestNotifications}
                    onChange={(e) => setFriendRequestNotifications(e.target.checked)}
                  />
                  Richieste di Amicizia
                </label>
              </div>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={systemNotifications}
                    onChange={(e) => setSystemNotifications(e.target.checked)}
                  />
                  Notifiche di Sistema
                </label>
              </div>

              <div className="setting-group">
                <label>Utenti Limitati (Non riceverai notifiche da questi utenti)</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Aggiungi nome utente..."
                  list="blocked-users"
                />
                <datalist id="blocked-users">
                  {blockedUsers.map((user, idx) => (
                    <option key={idx} value={user} />
                  ))}
                </datalist>
                {blockedUsers.length > 0 && (
                  <div className="blocked-list mt-2">
                    {blockedUsers.map((user, idx) => (
                      <span key={idx} className="badge badge-danger mr-2 mb-2">
                        {user} 
                        <button 
                          className="ml-1" 
                          onClick={() => setBlockedUsers(blockedUsers.filter((_, i) => i !== idx))}
                          style={{background: 'none', border: 'none', color: 'inherit'}}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button className="btn btn-primary save-btn" onClick={saveSettings}>
                💾 Salva Impostazioni
              </button>
            </div>
          )}

          {activeTab === 'app' && activeSubTab === 'accessibility' && (
            <div className="settings-panel">
              <h2>♿ Accessibilità</h2>
              
              <div className="setting-group">
                <label>Modalità Daltonico</label>
                <select 
                  className="form-control"
                  value={colorBlindMode}
                  onChange={(e) => setColorBlindMode(e.target.value)}
                >
                  <option value="normal">Nessuno</option>
                  <option value="deuteranopia">Deuteranopia (Rosso-Verde)</option>
                  <option value="protanopia">Protanopia (Rosso-Verde)</option>
                  <option value="tritanopia">Tritanopia (Blu-Giallo)</option>
                  <option value="achromatopsia">Acromatopsia (Monocromatico)</option>
                </select>
              </div>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                  />
                  Alto Contrasto
                </label>
              </div>

              <div className="setting-group">
                <label>Dimensione Testo</label>
                <div className="slider-group">
                  <input 
                    type="range" 
                    min="0.75" 
                    max="1.5" 
                    step="0.05"
                    value={textSize}
                    onChange={(e) => setTextSize(parseFloat(e.target.value))}
                    className="form-range"
                  />
                  <span className="text-size-display" style={{fontSize: `${textSize}rem`}}>
                    Aa
                  </span>
                </div>
                <small className="text-muted">{(textSize * 100).toFixed(0)}%</small>
              </div>

              <button className="btn btn-primary save-btn" onClick={saveSettings}>
                💾 Salva Impostazioni
              </button>
            </div>
          )}

          {activeTab === 'app' && activeSubTab === 'audio' && (
            <div className="settings-panel">
              <h2>🔊 Audio</h2>
              
              <div className="setting-group">
                <label>Dispositivo di Entrata (Microfono)</label>
                <select 
                  className="form-control"
                  value={inputDevice}
                  onChange={(e) => setInputDevice(e.target.value)}
                >
                  <option value="default">🎤 Predefinito</option>
                  <option value="headset">🎧 Headset</option>
                  <option value="usb">🔌 USB</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Dispositivo di Uscita (Altoparlante)</label>
                <select 
                  className="form-control"
                  value={outputDevice}
                  onChange={(e) => setOutputDevice(e.target.value)}
                >
                  <option value="default">🔊 Predefinito</option>
                  <option value="headphones">🎧 Cuffie</option>
                  <option value="speaker">📢 Altoparlante</option>
                  <option value="usb">🔌 USB</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Volume</label>
                <div className="slider-group">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="1"
                    value={volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                    className="form-range"
                  />
                  <span className="volume-display">{volume}%</span>
                </div>
              </div>

              <button className="btn btn-primary save-btn" onClick={saveSettings}>
                💾 Salva Impostazioni
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
