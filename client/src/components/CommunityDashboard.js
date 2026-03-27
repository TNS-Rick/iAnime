import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService, socketService } from '../services/api';

export default function CommunityDashboard() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const currentUser = authService.getUser() || {};

  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [activeTab, setActiveTab] = useState('channels');
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('text');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#00d4ff');
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);

  // Load communities on mount
  useEffect(() => {
    loadCommunities();

    // Ensure Socket.io is connected
    if (currentUser && currentUser.id) {
      const socket = socketService.getSocket();
      if (!socket || !socket.connected) {
        socketService.connect(currentUser.id);
      }
    }

    return () => {
      // Don't disconnect here as other components might need it
    };
  }, []);

  const loadCommunities = async () => {
    try {
      // Fetch communities from backend
      const response = await fetch('/api/v1/communities', {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Errore nel caricamento delle community');
      }
      const fetchedCommunities = data.communities || [];
      
      setCommunities(fetchedCommunities);

      // If a specific community was requested via URL param, load it
      if (communityId) {
        const comm = fetchedCommunities.find(c => c.id === parseInt(communityId));
        if (comm) {
          loadCommunityDetails(comm);
        }
      }
    } catch (error) {
      setMessage('❌ Errore nel caricamento delle community');
      console.error(error);
    }
  };

  const loadCommunityDetails = async (community) => {
    setSelectedCommunity(community);
    setChannels(community.channelGroups || []);
    setRoles(community.roles || []);
    
    // Fetch full user objects for members
    try {
      const memberIds = community.members || [];
      const memberUsers = await Promise.all(
        memberIds.map(async (memberId) => {
          try {
            const res = await fetch(`/api/v1/users/${memberId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (res.ok) {
              const data = await res.json();
              return data.user;
            }
          } catch (error) {
            console.error(`Error fetching user ${memberId}:`, error);
          }
          return null;
        })
      );
      setMembers(memberUsers.filter(m => m !== null));
    } catch (error) {
      console.error('Error loading member details:', error);
      setMembers([]);
    }
    
    // Check if current user is admin
    setIsAdmin(community.adminId === currentUser.id);
  };

  const handleJoinCommunity = async (communityIdToJoin) => {
    try {
      // POST /api/v1/communities/:id/join
      const response = await fetch(`/api/v1/communities/${communityIdToJoin}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      // Parse response body for error details
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nell\'adesione alla community');
      }

      // Refresh communities list
      await loadCommunities();
      setMessage('✅ Hai aderito alla community!');
    } catch (error) {
      setMessage('❌ ' + (error.message || 'Errore nella richiesta'));
      console.error('Join community error:', error);
    }
  };

  const handleLeaveCommunity = async () => {
    if (!selectedCommunity) {
      setMessage('❌ Nessuna community selezionata');
      return;
    }

    try {
      // POST /api/v1/communities/:id/leave
      const response = await fetch(`/api/v1/communities/${selectedCommunity.id}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Impossibile lasciare la community');
      }

      setCommunities(communities.filter(c => c.id !== selectedCommunity.id));
      setSelectedCommunity(null);
      setMessage('✅ Hai lasciato la community');
    } catch (error) {
      setMessage('❌ ' + error.message);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      setMessage('⚠️ Inserisci il nome del canale');
      return;
    }

    if (!selectedCommunity) {
      setMessage('⚠️ Seleziona una community');
      return;
    }

    try {
      // POST /api/v1/communities/:communityId/channels
      const response = await fetch(`/api/v1/communities/${selectedCommunity.id}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          name: newChannelName,
          type: newChannelType
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Errore nella creazione del canale');
      }
      setChannels([...channels, data.channel]);
      
      setNewChannelName('');
      setNewChannelType('text');
      setShowCreateChannel(false);
      setMessage(`✅ Canale #${newChannelName} creato`);
    } catch (error) {
      setMessage('❌ ' + error.message);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      setMessage('⚠️ Inserisci il nome del ruolo');
      return;
    }

    if (!selectedCommunity) {
      setMessage('⚠️ Seleziona una community');
      return;
    }

    try {
      // POST /api/v1/communities/:id/roles
      const response = await fetch(`/api/v1/communities/${selectedCommunity.id}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newRoleName,
          color: newRoleColor,
          permissions: ['writeMessages', 'readMessages'],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Errore nella creazione del ruolo');
      }
      setRoles([...roles, data.role]);

      setNewRoleName('');
      setNewRoleColor('#00d4ff');
      setShowCreateRole(false);
      setMessage(`✅ Ruolo ${newRoleName} creato`);
    } catch (error) {
      setMessage('❌ ' + error.message);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;

    try {
      // POST /api/v1/channels/:channelId/messages
      const response = await fetch(`/api/v1/channels/${selectedChannel.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newMessage }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Errore nell\'invio del messaggio');
      }
      const msg = {
        ...data.message,
        author: data.message.author || { id: currentUser.id, username: currentUser.username }
      };

      setMessages([...messages, msg]);
      setNewMessage('');
      setMessage('✅ Messaggio inviato');
    } catch (error) {
      setMessage('❌ ' + error.message);
    }
  };

  const handleSelectChannel = async (channel) => {
    setSelectedChannel(channel);
    
    try {
      // GET /api/v1/channels/:id/messages
      const response = await fetch(`/api/v1/channels/${channel.id}/messages`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Errore nel caricamento dei messaggi');
      }
      setMessages(data.messages || []);

      // Set up real-time listener for this channel
      socketService.onChannelMessage(channel.id, (data) => {
        if (data.type === 'message') {
          setMessages(prev => [...prev, data.message]);
        }
      });

    } catch (error) {
      console.error(error);
      setMessages([]);
      setMessage('⚠️ ' + error.message);
    }
  };

  const handleKickMember = async (memberId) => {
    if (!isAdmin) {
      setMessage('❌ Non hai i permessi per questa azione');
      return;
    }

    if (!selectedCommunity) {
      setMessage('❌ Nessuna community selezionata');
      return;
    }

    try {
      // POST /api/v1/communities/:communityId/members/:memberId/kick
      const response = await fetch(`/api/v1/communities/${selectedCommunity.id}/members/${memberId}/kick`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Impossibile rimuovere il membro');
      }

      setMembers(members.filter(m => m.id !== memberId));
      setMessage('✅ Membro rimosso');
    } catch (error) {
      setMessage('❌ ' + error.message);
    }
  };

  const handlePinMessage = async (msgId) => {
    if (!isAdmin) {
      setMessage('❌ Non hai i permessi per questa azione');
      return;
    }

    try {
      // In a real app: PUT /api/v1/communities/:id/messages/:msgId/pin
      const msg = messages.find(m => m.id === msgId);
      if (msg) {
        msg.isPinned = !msg.isPinned;
        setMessages([...messages]);
        setMessage(`✅ Messaggio ${msg.isPinned ? 'bloccato' : 'sbloccato'}`);
      }
    } catch (error) {
      setMessage('❌ Errore nel blocco del messaggio');
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      // In a real app: DELETE /api/v1/communities/:id/messages/:msgId
      setMessages(messages.filter(m => m.id !== msgId));
      setMessage('✅ Messaggio eliminato');
    } catch (error) {
      setMessage('❌ Errore nell\'eliminazione del messaggio');
    }
  };

  return (
    <div className="community-container">
      <div className="community-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Indietro</button>
        <h1>🏘️ Community</h1>
      </div>

      {message && (
        <div className={`alert ${message.includes('✅') ? 'alert-success' : message.includes('❌') ? 'alert-danger' : 'alert-warning'}`}>
          {message}
        </div>
      )}

      <div className="community-layout">
        {/* Communities List Sidebar */}
        <div className="communities-sidebar">
          <h3>Le Mie Community</h3>
          <div className="communities-list">
            {communities.map(comm => (
              <div 
                key={comm.id}
                className={`community-item ${selectedCommunity?.id === comm.id ? 'active' : ''}`}
                onClick={() => loadCommunityDetails(comm)}
              >
                <div className="community-name">{comm.name}</div>
                <div className="community-stats">
                  {comm.members.length} membri
                </div>
              </div>
            ))}
          </div>

          {/* Community Discovery */}
          <div className="community-discovery">
            <h4>🔎 Scopri Community</h4>
            {communities
              .filter(c => !c.members.includes(currentUser.id) && !c.members.some(m => parseInt(m) === currentUser.id))
              .map(comm => (
                <div key={comm.id} className="discovery-card">
                  <h5>{comm.name}</h5>
                  <p>{comm.description}</p>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleJoinCommunity(comm.id)}
                  >
                    ➕ Aderisci
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Community Content */}
        {selectedCommunity ? (
          <div className="community-content">
            <div className="community-header-section">
              <h2>{selectedCommunity.name}</h2>
              <p className="text-muted">{selectedCommunity.description}</p>
              {!isAdmin && (
                <button 
                  className="btn btn-outline-danger"
                  onClick={handleLeaveCommunity}
                >
                  👋 Abbandona Community
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="community-tabs">
              <button 
                className={`tab-btn ${activeTab === 'channels' ? 'active' : ''}`}
                onClick={() => setActiveTab('channels')}
              >
                #️⃣ Canali
              </button>
              <button 
                className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
                onClick={() => setActiveTab('members')}
              >
                👥 Membri
              </button>
              <button 
                className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
                onClick={() => setActiveTab('roles')}
              >
                🎭 Ruoli
              </button>
              {isAdmin && (
                <button 
                  className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => setActiveTab('admin')}
                >
                  ⚙️ Impostazioni
                </button>
              )}
            </div>

            {/* Channels Tab */}
            {activeTab === 'channels' && (
              <div className="tab-content">
                {selectedChannel ? (
                  <div className="channel-view">
                    <div className="channel-header">
                      <button className="back-btn" onClick={() => setSelectedChannel(null)}>← Indietro</button>
                      <h3>{selectedChannel.type === 'voice' ? '🔊' : '#'} {selectedChannel.name}</h3>
                    </div>

                    {/* Messages */}
                    <div className="messages-container">
                      {messages.length === 0 ? (
                        <p className="text-muted text-center">Nessun messaggio. Sii il primo a scrivere!</p>
                      ) : (
                        messages.map(msg => (
                          <div key={msg.id} className={`message ${msg.isPinned ? 'pinned' : ''}`}>
                            <div className="message-header">
                              <strong>{typeof msg.author === 'object' ? msg.author?.username : msg.author}</strong>
                              <small className="text-muted">
                                {new Date(msg.timestamp).toLocaleTimeString('it-IT')}
                              </small>
                            </div>
                            <p className="message-content">{msg.content}</p>
                            <div className="message-actions">
                              {msg.isPinned && <span className="badge badge-primary">📌 Fissato</span>}
                              {isAdmin && (
                                <>
                                  <button 
                                    className="action-btn"
                                    onClick={() => handlePinMessage(msg.id)}
                                    title={msg.isPinned ? 'Unfissa' : 'Fissa'}
                                  >
                                    📌
                                  </button>
                                  <button 
                                    className="action-btn delete"
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    title="Cancella"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="message-input-group">
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
                ) : (
                  <div className="channels-grid">
                    <div className="section-header">
                      <h4>Canali</h4>
                      {isAdmin && (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => setShowCreateChannel(!showCreateChannel)}
                        >
                          ➕ Nuovo Canale
                        </button>
                      )}
                    </div>

                    {showCreateChannel && (
                      <div className="create-form">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Nome canale..."
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                        />
                        <select 
                          className="form-control"
                          value={newChannelType}
                          onChange={(e) => setNewChannelType(e.target.value)}
                        >
                          <option value="text">Testo</option>
                          <option value="voice">Voce</option>
                        </select>
                        <button 
                          className="btn btn-primary"
                          onClick={handleCreateChannel}
                        >
                          Crea
                        </button>
                      </div>
                    )}

                    {channels.map(channel => (
                      <div 
                        key={channel.id}
                        className="channel-card"
                        onClick={() => handleSelectChannel(channel)}
                      >
                        <div className="channel-icon">
                          {channel.type === 'voice' ? '🔊' : '#'}
                        </div>
                        <h5>{channel.name}</h5>
                        <p className="text-muted">{channel.members} membri</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="tab-content">
                <h4>Membri della Community</h4>
                <div className="members-grid">
                  {members.map(member => (
                    <div key={member.id} className="member-card">
                      <div className="member-info">
                        <h5>{member.username}</h5>
                        {selectedCommunity.adminId === member.id && (
                          <span className="badge badge-danger">👑 Admin</span>
                        )}
                      </div>
                      {isAdmin && member.id !== currentUser.id && (
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleKickMember(member.id)}
                        >
                          🚪 Rimuovi
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Roles Tab */}
            {activeTab === 'roles' && (
              <div className="tab-content">
                <div className="section-header">
                  <h4>Ruoli</h4>
                  {isAdmin && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowCreateRole(!showCreateRole)}
                    >
                      ➕ Nuovo Ruolo
                    </button>
                  )}
                </div>

                {showCreateRole && (
                  <div className="create-form">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nome ruolo..."
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                    />
                    <input
                      type="color"
                      className="form-control"
                      value={newRoleColor}
                      onChange={(e) => setNewRoleColor(e.target.value)}
                    />
                    <button 
                      className="btn btn-primary"
                      onClick={handleCreateRole}
                    >
                      Crea
                    </button>
                  </div>
                )}

                {roles.map(role => (
                  <div key={role.id} className="role-card" style={{ borderLeftColor: role.color }}>
                    <h5 style={{ color: role.color }}>{role.name}</h5>
                    <p className="text-muted">Permessi:</p>
                    <ul>
                      {role.permissions.map((perm, idx) => (
                        <li key={idx}>✓ {perm}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Admin Settings Tab */}
            {activeTab === 'admin' && isAdmin && (
              <div className="tab-content">
                <h4>⚙️ Impostazioni Admin</h4>
                <div className="admin-panel">
                  <div className="admin-section">
                    <h5>Community</h5>
                    <button className="btn btn-secondary">Modifica Descrizione</button>
                    <button className="btn btn-danger">🗑️ Elimina Community</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <p>Seleziona una community o aderisci a una per iniziare</p>
          </div>
        )}
      </div>
    </div>
  );
}
