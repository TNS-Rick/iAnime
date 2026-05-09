import React, { useState } from 'react';
import { authService } from '../services/api';
import { generateAndStoreKeyPair } from '../services/crypto';
import './Auth.css';

export default function Register({ onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Validazioni locali
    if (formData.username.length < 3) {
      setError('❌ Il nome utente deve avere almeno 3 caratteri');
      return;
    }

    if (formData.password.length < 8) {
      setError('❌ La password deve avere almeno 8 caratteri');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('❌ Le password non corrispondono');
      return;
    }

    setIsLoading(true);

    try {
      // Generate E2EE keypair and send public key to server during registration
      const publicKey = await generateAndStoreKeyPair();

      const data = await authService.register(
        formData.email,
        formData.password,
        formData.username,
        publicKey
      );
      onRegisterSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Errore di registrazione');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>⚡ iAnime</h1>
          <p>Crea il tuo account</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">👤 Nome Utente</label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-control"
              placeholder="il_tuo_username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
            <small className="text-muted">Almeno 3 caratteri, alphanumerico</small>
          </div>

          <div className="form-group">
            <label htmlFor="email">📧 Email</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              placeholder="tuo@email.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">🔐 Password</label>
            <div className="password-input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="form-control"
                placeholder="Almeno 8 caratteri"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">🔐 Conferma Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              className="form-control"
              placeholder="Ripeti la password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-btn"
            disabled={isLoading}
          >
            {isLoading ? '⏳ Registrazione in corso...' : '✨ Registrati'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Hai già un account?{' '}
            <a href="#" onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('showLogin'));
            }}>
              Accedi qui
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
