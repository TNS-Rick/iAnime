import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SocialDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Load friends and friend requests
  useEffect(() => {
    loadFriendsData();
  }, []);

  const loadFriendsData = async () => {
    try {
      // In a real app, these would be API calls
      const savedFriends = JSON.parse(localStorage.getItem('friends') || '[]');
      const savedRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
      setFriends(savedFriends);
      setFriendRequests(savedRequests);
    } catch (error) {
      console.error('Errore nel caricamento amicizie:', error);
    }
  };

  const handleSearchUsers = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setMessage('❌ Inserisci un nome utente');
      return;
    }

    setIsSearching(true);
    try {
      // Simula una ricerca sul database
      // In a real app, would call: GET /api/v1/users/search?username=...
      const mockUsers = [
        { id: 2, username: 'demon_slayer_fan', email: 'demon@example.com', profileImage: 'https://via.placeholder.com/150' },
        { id: 3, username: 'tanjiro_sama', email: 'tanjiro@example.com', profileImage: 'https://via.placeholder.com/150' },
      ];
      
      const filtered = mockUsers.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
        u.id !== currentUser.id &&
        !blockedUsers.includes(u.id)
      );
      
      setSearchResults(filtered);
      if (filtered.length === 0) {
        setMessage('⚠️ Nessun utente trovato');
      }
    } catch (error) {
      setMessage('❌ Errore nella ricerca');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setUserProfile(user);
    // Simula il caricamento della chat
    setChatMessages([]);
    setNewMessage('');
  };

  const handleSendFriendRequest = async () => {
    if (!selectedUser) return;

    try {
      // In a real app: POST /api/v1/friendships
      const request = {
        requester: currentUser.id,
        recipient: selectedUser.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Salva localmente (in production sarebbe nel DB)
      localStorage.setItem('friendRequests', JSON.stringify([
        ...friendRequests,
        request
      ]));

      setMessage(`✅ Richiesta di amicizia inviata a ${selectedUser.username}`);
      setSelectedUser(null);
      setUserProfile(null);
    } catch (error) {
      setMessage('❌ Errore nell\'invio della richiesta');
    }
  };

  const handleAcceptFriendRequest = (requestId) => {
    // In a real app: PUT /api/v1/friendships/:id
    const updated = friendRequests.filter(r => r.id !== requestId);
    setFriendRequests(updated);
    setMessage('✅ Richiesta di amicizia accettata');
  };

  const handleRejectFriendRequest = (requestId) => {
    const updated = friendRequests.filter(r => r.id !== requestId);
    setFriendRequests(updated);
    setMessage('✅ Richiesta di amicizia rifiutata');
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;

    try {
      // In a real app: POST /api/v1/block
      const newBlocked = [...blockedUsers, selectedUser.id];
      setBlockedUsers(newBlocked);
      localStorage.setItem('blockedUsers', JSON.stringify(newBlocked));
      
      setMessage(`🚫 ${selectedUser.username} è stato bloccato`);
      setSelectedUser(null);
      setUserProfile(null);
    } catch (error) {
      setMessage('❌ Errore nel blocco dell\'utente');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const message = {
        id: Date.now(),
        author: currentUser.username,
        content: newMessage,
        timestamp: new Date().toISOString(),
      };

      setChatMessages([...chatMessages, message]);
      setNewMessage('');
    } catch (error) {
      setMessage('❌ Errore nell\'invio del messaggio');
    }
  };

  const handleUnblockUser = (userId) => {
    const updated = blockedUsers.filter(id => id !== userId);
    setBlockedUsers(updated);
    localStorage.setItem('blockedUsers', JSON.stringify(updated));
    setMessage('✅ Utente sbloccato');
  };

  return (
    <div className="social-container">
      <div className="social-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Indietro</button>
        <h1>👥 Social Network</h1>
      </div>

      {message && (
        <div className={`alert ${message.includes('✅') ? 'alert-success' : message.includes('❌') ? 'alert-danger' : 'alert-warning'}`}>
          {message}
        </div>
      )}

      <div className="social-layout">
        {/* Sidebar Navigation */}
        <div className="social-sidebar">
          <button 
            className={`social-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 Cerca Utenti
          </button>
          <button 
            className={`social-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            📬 Richieste ({friendRequests.length})
          </button>
          <button 
            className={`social-tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            👫 Amici ({friends.length})
          </button>
          <button 
            className={`social-tab-btn ${activeTab === 'blocked' ? 'active' : ''}`}
            onClick={() => setActiveTab('blocked')}
          >
            🚫 Bloccati ({blockedUsers.length})
          </button>
        </div>

        {/* Main Content */}
        <div className="social-content">
          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="social-panel">
              <h2>🔍 Cerca Utenti</h2>
              
              <form onSubmit={handleSearchUsers} className="search-form">
                <div className="form-group">
                  <label>Nome Utente</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cerca utente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSearching}
                >
                  {isSearching ? '⏳ Ricerca...' : '🔎 Cerca'}
                </button>
              </form>

              {/* Search Results */}
              <div className="search-results">
                {searchResults.length === 0 ? (
                  <p className="text-muted">Nessun risultato. Inserisci un nome utente.</p>
                ) : (
                  searchResults.map(user => (
                    <div key={user.id} className="user-card" onClick={() => handleUserClick(user)}>
                      <img src={user.profileImage} alt={user.username} className="user-avatar" />
                      <div className="user-info">
                        <h4>{user.username}</h4>
                        <p className="text-muted">{user.email}</p>
                      </div>
                      <button className="btn btn-primary btn-sm">
                        Visualizza
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Friend Requests Tab */}
          {activeTab === 'requests' && (
            <div className="social-panel">
              <h2>📬 Richieste di Amicizia</h2>
              
              {friendRequests.length === 0 ? (
                <p className="text-muted">Nessuna richiesta di amicizia in sospeso</p>
              ) : (
                <div className="requests-list">
                  {friendRequests.map((req, idx) => (
                    <div key={idx} className="request-card">
                      <div className="request-info">
                        <h4>Da: {req.requesterName || 'Utente'}</h4>
                        <p className="text-muted">{new Date(req.createdAt).toLocaleDateString('it-IT')}</p>
                      </div>
                      <div className="request-actions">
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAcceptFriendRequest(req.id)}
                        >
                          ✅ Accetta
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRejectFriendRequest(req.id)}
                        >
                          ❌ Rifiuta
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div className="social-panel">
              <h2>👫 I Tuoi Amici</h2>
              
              {friends.length === 0 ? (
                <p className="text-muted">Non hai amici. Inizia a cercarne!</p>
              ) : (
                <div className="friends-grid">
                  {friends.map(friend => (
                    <div key={friend.id} className="friend-card">
                      <img src={friend.profileImage} alt={friend.username} />
                      <h4>{friend.username}</h4>
                      <div className="friend-actions">
                        <button className="btn btn-primary btn-sm">
                          💬 Messaggio
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Blocked Users Tab */}
          {activeTab === 'blocked' && (
            <div className="social-panel">
              <h2>🚫 Utenti Bloccati</h2>
              
              {blockedUsers.length === 0 ? (
                <p className="text-muted">Non hai bloccato nessuno</p>
              ) : (
                <div className="blocked-list">
                  {blockedUsers.map((userId, idx) => (
                    <div key={idx} className="blocked-user">
                      <span>{userId}</span>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleUnblockUser(userId)}
                      >
                        🔓 Sblocca
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User Profile & Chat */}
          {userProfile && (
            <div className="user-profile-modal">
              <div className="modal-overlay" onClick={() => setUserProfile(null)}></div>
              <div className="modal-content">
                <button className="close-btn" onClick={() => setUserProfile(null)}>✕</button>
                
                <div className="profile-section">
                  <img src={userProfile.profileImage} alt={userProfile.username} className="profile-image-large" />
                  <h2>{userProfile.username}</h2>
                  <p className="text-muted">{userProfile.email}</p>
                  
                  <div className="profile-actions">
                    {!friends.find(f => f.id === userProfile.id) ? (
                      <button 
                        className="btn btn-primary"
                        onClick={handleSendFriendRequest}
                      >
                        👫 Invia Richiesta
                      </button>
                    ) : (
                      <button className="btn btn-success" disabled>
                        ✅ Sei Amico
                      </button>
                    )}
                    <button 
                      className="btn btn-danger"
                      onClick={handleBlockUser}
                    >
                      🚫 Blocca
                    </button>
                  </div>
                </div>

                {/* Chat */}
                <div className="chat-section">
                  <h3>💬 Chat Privata</h3>
                  
                  <div className="chat-messages">
                    {chatMessages.length === 0 ? (
                      <p className="text-muted text-center">Nessun messaggio. Inizia la conversazione!</p>
                    ) : (
                      chatMessages.map(msg => (
                        <div key={msg.id} className={`chat-message ${msg.author === currentUser.username ? 'sent' : 'received'}`}>
                          <p className="message-author">{msg.author}</p>
                          <p className="message-content">{msg.content}</p>
                          <small className="text-muted">{new Date(msg.timestamp).toLocaleTimeString('it-IT')}</small>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="chat-input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Scrivi un messaggio..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button 
                      className="btn btn-primary"
                      onClick={handleSendMessage}
                    >
                      📤 Invia
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
