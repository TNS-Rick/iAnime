import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

export default function TwoFactorSetup() {
  const navigate = useNavigate();
  const currentUser = authService.getUser() || {};

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState('app');
  const [selectedMethod, setSelectedMethod] = useState('app');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [twoFASetup, setTwoFASetup] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [destinationHint, setDestinationHint] = useState('');
  const [devCodePreview, setDevCodePreview] = useState('');
  const [twoFAPassword, setTwoFAPassword] = useState('');
  const [disableChallengeId, setDisableChallengeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setTwoFAEnabled(currentUser.twoFAEnabled || false);
    setTwoFAMethod(currentUser.twoFAMethod || 'app');
  }, [currentUser.twoFAEnabled, currentUser.twoFAMethod]);

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

  const handleStartSetup = async () => {
    try {
      setErrorMessage('');
      setSuccessMessage('');
      setLoading(true);
      const data = await authService.setupTwoFA(selectedMethod, phoneNumber);
      setTwoFASetup(data);
      setChallengeId(data.challengeId || '');
      setDestinationHint(data.destinationMasked || '');
      setDevCodePreview(data.devCodePreview || '');
      setTwoFACode('');
    } catch (error) {
      setErrorMessage('❌ ' + error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSetup = async () => {
    if (!twoFACode.trim()) {
      setErrorMessage('❌ Inserisci il codice di verifica');
      return;
    }

    try {
      setErrorMessage('');
      setSuccessMessage('');
      setLoading(true);
      const data = await authService.confirmTwoFA({
        method: selectedMethod,
        secret: twoFASetup?.secret || '',
        code: twoFACode,
        challengeId,
        phoneNumber,
      });
      if (data?.user) {
        authService.setUser(data.user);
      }

      await refreshCurrentUser();
      setTwoFASetup(null);
      setTwoFACode('');
      setChallengeId('');
      setDestinationHint('');
      setDevCodePreview('');
      setSuccessMessage('✅ 2FA attivato con successo!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('❌ ' + error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!twoFAPassword.trim()) {
      setErrorMessage('❌ Inserisci la password corrente per disattivare 2FA');
      return;
    }

    if (!twoFACode.trim()) {
      setErrorMessage('❌ Inserisci il codice 2FA per disattivare la protezione');
      return;
    }

    try {
      setErrorMessage('');
      setSuccessMessage('');
      setLoading(true);
      const data = await authService.disableTwoFA(twoFAPassword, twoFACode, disableChallengeId);
      if (data?.user) {
        authService.setUser(data.user);
      }

      await refreshCurrentUser();
      setTwoFACode('');
      setTwoFAPassword('');
      setTwoFASetup(null);
      setDisableChallengeId('');
      setDestinationHint('');
      setDevCodePreview('');
      setSuccessMessage('✅ 2FA disattivato con successo!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      if (error.requiresTwoFA) {
        setDisableChallengeId(error.challengeId || '');
        setDestinationHint(error.destinationMasked || '');
        setDevCodePreview(error.devCodePreview || '');
        setErrorMessage(`❌ ${error.error || 'Inserisci il codice ricevuto per completare la disattivazione'}`);
      } else {
        setErrorMessage('❌ ' + error.message);
      }
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate('/settings')}>← Torna alle Impostazioni</button>
        <h1>🔐 Setup 2FA</h1>
      </div>

      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

      <div className="settings-content" style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div className="settings-panel">
          <h2>Autenticazione a Due Fattori</h2>
          <p className="text-muted">
            Proteggi il tuo account con un'app autenticatore. Dopo l'attivazione, il login richiederà password + codice OTP.
          </p>

          {twoFAEnabled ? (
            <>
              <div className="alert alert-info">
                2FA attivo con metodo: {twoFAMethod === 'app' ? 'App autenticatore' : twoFAMethod}
              </div>

              {(twoFAMethod === 'email' || twoFAMethod === 'phone') && (
                <div className="alert alert-warning">
                  Per disattivare 2FA con metodo {twoFAMethod}, inserisci password e poi invia. Se richiesto, ti verra inviato un codice di conferma.
                </div>
              )}

              <div className="setting-group">
                <label>Password corrente</label>
                <input
                  type="password"
                  className="form-control"
                  value={twoFAPassword}
                  onChange={(e) => setTwoFAPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="setting-group">
                <label>Codice 2FA corrente</label>
                <input
                  type="text"
                  className="form-control"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value)}
                  placeholder={twoFAMethod === 'app' ? '123456' : 'Codice ricevuto'}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                {(twoFAMethod === 'email' || twoFAMethod === 'phone') && destinationHint && (
                  <small className="text-muted d-block mt-1">
                    Destinazione: {destinationHint}
                  </small>
                )}
                {devCodePreview && (
                  <small className="text-warning d-block mt-1">
                    Codice debug: {devCodePreview}
                  </small>
                )}
              </div>

              <button className="btn btn-danger" onClick={handleDisable} disabled={loading}>
                {loading ? '⏳ Disattivazione...' : '🚫 Disattiva 2FA'}
              </button>
            </>
          ) : (
            <>
              <div className="setting-group">
                <label>Metodo 2FA</label>
                <select
                  className="form-control"
                  value={selectedMethod}
                  onChange={(e) => {
                    setSelectedMethod(e.target.value);
                    setTwoFASetup(null);
                    setTwoFACode('');
                    setChallengeId('');
                    setDestinationHint('');
                    setDevCodePreview('');
                  }}
                >
                  <option value="app">🔐 App autenticatore</option>
                  <option value="email">📧 Email</option>
                  <option value="phone">📱 Numero di telefono (SMS)</option>
                </select>
              </div>

              {selectedMethod === 'phone' && (
                <div className="setting-group">
                  <label>Numero di telefono</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+39 333 1234567"
                  />
                </div>
              )}

              {!twoFASetup ? (
                <button className="btn btn-primary" onClick={handleStartSetup} disabled={loading}>
                  {loading ? '⏳ Preparazione...' : '🔐 Inizia Setup 2FA'}
                </button>
              ) : (
                <div className="mt-3 p-3" style={{ border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '12px', background: 'rgba(0, 212, 255, 0.05)' }}>
                  {selectedMethod === 'app' ? (
                    <>
                      <h5 style={{ color: '#00d4ff' }}>Passo 1: scansiona il QR</h5>
                      <p className="text-muted mb-2">
                        Aggiungi l'account nella tua app autenticatore, poi inserisci qui il codice generato.
                      </p>

                      <div className="mb-3">
                        <img
                          src={twoFASetup.qrCodeDataUrl}
                          alt="QR code 2FA"
                          style={{ width: '220px', maxWidth: '100%', background: '#fff', padding: '8px', borderRadius: '12px' }}
                        />
                      </div>

                      <p className="text-muted mb-2">
                        Secret manuale: <strong style={{ color: '#00d4ff' }}>{twoFASetup.secret}</strong>
                      </p>
                    </>
                  ) : (
                    <>
                      <h5 style={{ color: '#00d4ff' }}>Passo 1: inserisci il codice ricevuto</h5>
                      <p className="text-muted mb-2">
                        Ti abbiamo inviato un codice a {destinationHint || (selectedMethod === 'email' ? 'email' : 'numero di telefono')}.
                      </p>
                      {devCodePreview && (
                        <p className="text-warning mb-2">Codice debug: {devCodePreview}</p>
                      )}
                    </>
                  )}

                  <div className="setting-group">
                    <label>Codice di verifica</label>
                    <input
                      type="text"
                      className="form-control"
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value)}
                      placeholder="123456"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-primary" onClick={handleConfirmSetup} disabled={loading}>
                      {loading ? '⏳ Verifica...' : '✅ Conferma e attiva 2FA'}
                    </button>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setTwoFASetup(null);
                        setTwoFACode('');
                        setChallengeId('');
                        setDestinationHint('');
                        setDevCodePreview('');
                      }}
                      disabled={loading}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
