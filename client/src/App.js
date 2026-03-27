
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AnimeSearch from './components/AnimeSearch';
import Community from './components/Community';
import MerchSuggestions from './components/MerchSuggestions';
import AnimeDetail from './components/AnimeDetail';
import Settings from './components/Settings';
import SocialDashboard from './components/SocialDashboard';
import CommunityDashboard from './components/CommunityDashboard';
import TestPage from './components/TestPage';
import Login from './components/Login';
import Register from './components/Register';
import { authService, socketService } from './services/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  // Verifica la sessione al caricamento dell'app
  useEffect(() => {
    const verifySession = async () => {
      const savedToken = authService.getToken();

      if (savedToken) {
        try {
          const response = await authService.getCurrentUser();
          authService.setUser(response.user);
          setUser(response.user);
          setToken(savedToken);
          // Connetti Socket.io
          socketService.connect(response.user.id);
        } catch (error) {
          console.log('Token non valido, effettua login');
          authService.clearToken();
        }
      }
      setIsLoading(false);
    };

    verifySession();

    // Event listeners per switch tra login e register
    const handleShowRegister = () => setShowRegister(true);
    const handleShowLogin = () => setShowRegister(false);

    window.addEventListener('showRegister', handleShowRegister);
    window.addEventListener('showLogin', handleShowLogin);

    return () => {
      window.removeEventListener('showRegister', handleShowRegister);
      window.removeEventListener('showLogin', handleShowLogin);
      socketService.disconnect();
    };
  }, []);

  const handleLoginSuccess = (userData, userToken) => {
    authService.setToken(userToken);
    authService.setUser(userData);
    setUser(userData);
    setToken(userToken);
    // Connetti Socket.io
    socketService.connect(userData.id);
  };

  const handleLogout = () => {
    authService.clearToken();
    socketService.disconnect();
    setUser(null);
    setToken(null);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #050812 0%, #1a0033 100%)',
        color: '#00d4ff',
        fontSize: '1.2rem'
      }}>
        ⏳ Caricamento...
      </div>
    );
  }

  // Se l'utente non è autenticato, mostra login/register
  if (!user || !token) {
    return (
      <Router>
        {showRegister ? (
          <Register onRegisterSuccess={handleLoginSuccess} />
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
      </Router>
    );
  }

  // Se l'utente è autenticato, mostra l'app
  return (
    <Router>
      <nav className="navbar navbar-expand-lg navbar-dark">
        <div className="container-fluid">
          <a className="navbar-brand" href="/">
            ⚡ iAnime
          </a>
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a className="nav-link" href="/">Scopri</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/community">Community</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/social">👥 Social</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/#merch">Merchandising</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/settings">⚙️ Impostazioni</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/test">🧪 Test</a>
              </li>
              <li className="nav-item">
                <span className="nav-link" style={{color: '#00d4ff'}}>
                  👤 {user.username}
                </span>
              </li>
              <li className="nav-item">
                <button 
                  className="nav-link"
                  onClick={handleLogout}
                  style={{background: 'none', border: 'none', cursor: 'pointer'}}
                >
                  🚪 Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="main-container">
        <section className="hero-section">
          <h1>iAnime</h1>
          <p>Scopri anime, unisciti alla community globale e trova merchandising esclusivo in un'unica piattaforma futuristica</p>
        </section>

        <Routes>
          <Route path="/" element={
            <>
              <section>
                <h2 className="text-primary mb-4" style={{fontSize: '1.8rem', fontWeight: 'bold'}}>
                  🔍 Ricerca Anime
                </h2>
                <AnimeSearch />
              </section>

              <hr />

              <section id="community">
                <h2 className="text-primary mb-4" style={{fontSize: '1.8rem', fontWeight: 'bold'}}>
                  👥 Community Globale
                </h2>
                <Community />
              </section>

              <hr />

              <section id="merch">
                <h2 className="text-primary mb-4" style={{fontSize: '1.8rem', fontWeight: 'bold'}}>
                  🛍️ Merchandising Consigliato
                </h2>
                <MerchSuggestions />
              </section>
            </>
          } />
          <Route path="/anime/:id" element={<AnimeDetail />} />
          <Route path="/community" element={<CommunityDashboard />} />
          <Route path="/community/:communityId" element={<CommunityDashboard />} />
          <Route path="/social" element={<SocialDashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/test" element={<TestPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
