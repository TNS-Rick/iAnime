import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, socketService } from '../services/api';

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
  const token = localStorage.getItem('auth_token');
  const currentUser = authService.getUser() || {};

  // Load friends and friend requests
  useEffect(() => {
    loadFriendsData();

    // Ensure Socket.io is connected for real-time DMs
    if (currentUser && currentUser.id) {
      const socket = socketService.getSocket();
      if (!socket || !socket.connected) {
        socketService.connect(currentUser.id);
      }

      // Listen for incoming DMs
      socketService.onDM((data) => {
        if (data.message) {
          setChatMessages(prev => [...prev, data.message]);
        }
      });
    }

    return () => {
      // Don't disconnect as other components might need it
    };
  }, []);

  const loadFriendsData = async () => {
    try {
      // Fetch friend requests: GET /api/v1/friendships/requests
      const requestsResponse = await fetch('/api/v1/friendships/requests', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        const requests = requestsData.friendRequests || [];
        
        // Fetch requester details for each request
        const requestsWithDetails = await Promise.all(
          requests.map(async (req) => {
            try {
              const userRes = await fetch(`/api/v1/users/${req.requester}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              if (userRes.ok) {
                const userData = await userRes.json();
                return { ...req, requusterDetails: userData.user };
              }
            } catch (err) {
              console.error('Error fetching requester details:', err);
            }
            return req;
          })
        );
        
        setFriendRequests(requestsWithDetails);
      }

      // Fetch friends: GET /api/v1/friendships
      const friendsResponse = await fetch('/api/v1/friendships', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json();
        setFriends(friendsData.friends || []);
      }

      // Fetch blocked users: GET /api/v1/users/blocked/list
      const blockedResponse = await fetch('/api/v1/users/blocked/list', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (blockedResponse.ok) {
        const blockedData = await blockedResponse.json();
        setBlockedUsers(blockedData.blockedUsers || []);
      }
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
      // GET /api/v1/users/search?query=...
      const response = await fetch(`/api/v1/users/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Errore nella ricerca');
      }

      const filtered = data.users.filter(u => 
        u.id !== currentUser.id &&
        !blockedUsers.some(bu => bu.id === u.id)
      );
      
      setSearchResults(filtered);
      if (filtered.length === 0) {
        setMessage('⚠️ Nessun utente trovato');
      }
    } catch (error) {
      setMessage('❌ ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setUserProfile(user);
    setChatMessages([]);
    setNewMessage('');
  };

  const handleSendFriendRequest = async () => {
    if (!selectedUser) return;

    try {
      // POST /api/v1/friendships
      const response = await fetch('/api/v1/friendships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientId: selectedUser.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Impossibile inviare la richiesta di amicizia');
      }

      setMessage(`✅ Richiesta di amicizia inviata a ${selectedUser.username}`);
      setSelectedUser(null);
      setUserProfile(null);
    } catch (error) {
      setMessage('❌ Errore nell\'invio della richiesta');
    }
  };

  const handleAcceptFriendRequest = async (requestId) => {
    try {
      // POST /api/v1/friendships/:id/accept
      const response = await fetch(`/api/v1/friendships/${requestId}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Errore nell\'accettazione della richiesta');
      }

      await loadFriendsData();
      setMessage('✅ Richiesta di amicizia accettata');
    } catch (error) {
      setMessage('❌ ' + error.message);
    }
  };

  const handleRejectFriendRequest = async (requestId) => {
    try {
      // POST /api/v1/friendships/:id/reject
      const response = await fetch(`/api/v1/friendships/${requestId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Errore nel rifiuto della richiesta');
      }

      await loadFriendsData();
      setMessage('✅ Richiesta di amicizia rifiutata');
    } catch (error) {
      setMessage('❌ ' + error.message);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;

    try {
      // POST /api/v1/users/:id/block
      const response = await fetch(`/api/v1/users/${selectedUser.id}/block`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Errore nel blocco dell\'utente');
      }

      await loadFriendsData();
      setMessage(`🚫 ${selectedUser.username} è stato bloccato`);
      setSelectedUser(null);
      setUserProfile(null);
    } catch (error) {
      setMessage('❌ ' + error.message);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      // POST /api/v1/direct-messages
      const response = await fetch('/api/v1/direct-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: selectedUser.id,
          content: newMessage.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Errore nell\'invio del messaggio');
      }

      // Add message to local state
      const message = {
        ...data.message,
        author: data.message?.author || { id: currentUser.id, username: currentUser.username }
      };

      setChatMessages([...chatMessages, message]);
      setNewMessage('');
      setMessage('✅ Messaggio inviato');
    } catch (error) {
      setMessage('❌ ' + error.message);
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      // DELETE /api/v1/users/:id/block
      const response = await fetch(`/api/v1/users/${userId}/block`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Errore nello sblocco dell\'utente');
      }

      await loadFriendsData();
      setMessage('✅ Utente sbloccato');
    } catch (error) {
      setMessage('❌ ' + error.message);
    }
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
                  {friendRequests.map((req) => (
                    <div key={req.id} className="request-card">
                      <div className="request-info">
                        <h4>Da: {req.requusterDetails?.username || `Utente ${req.requester}`}</h4>
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
                  {blockedUsers.map((user) => (
                    <div key={user.id} className="blocked-user">
                      <div className="blocked-user-info">
                        <img src={user.profileImage || 'https://via.placeholder.com/40'} alt={user.username} className="user-avatar-sm" />
                        <div>
                          <h5>{user.username}</h5>
                          <p className="text-muted text-sm">{user.email}</p>
                        </div>
                      </div>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleUnblockUser(user.id)}
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
                          <p className="message-author">{typeof msg.author === 'object' ? msg.author?.username : msg.author}</p>
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
