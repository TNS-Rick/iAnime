import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function CommunityDashboard() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

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
  }, []);

  const loadCommunities = async () => {
    try {
      // Mock data - in a real app: GET /api/v1/communities
      const mockCommunities = [
        {
          id: 1,
          name: 'Anime Lovers',
          description: 'Community per amanti di anime',
          adminId: 1,
          members: [
            { id: 1, username: 'naruto_fan' },
            { id: 2, username: 'demon_slayer_fan' },
            { id: 3, username: 'tanjiro_sama' },
          ],
          channels: [
            { id: 1, name: 'generale', type: 'text', members: 3 },
            { id: 2, name: 'discussioni', type: 'text', members: 2 },
            { id: 3, name: 'voice-chat', type: 'voice', members: 1 },
          ],
          roles: [
            { id: 1, name: 'Admin', permissions: ['kick', 'deleteMsg', 'mute', 'manageRoles', 'manageChannels', 'pinMessages'], color: '#ff006e' },
            { id: 2, name: 'Moderator', permissions: ['deleteMsg', 'mute', 'pinMessages'], color: '#8338ec' },
            { id: 3, name: 'Membro', permissions: ['writeMessages', 'readMessages'], color: '#00d4ff' },
          ],
          pinnedMessages: [],
        },
      ];

      setCommunities(mockCommunities);
      if (communityId) {
        const comm = mockCommunities.find(c => c.id === parseInt(communityId));
        if (comm) {
          loadCommunityDetails(comm);
        }
      }
    } catch (error) {
      setMessage('❌ Errore nel caricamento delle community');
      console.error(error);
    }
  };

  const loadCommunityDetails = (community) => {
    setSelectedCommunity(community);
    setChannels(community.channels || []);
    setMembers(community.members || []);
    setRoles(community.roles || []);
    
    // Check if current user is admin
    setIsAdmin(community.adminId === currentUser.id);
  };

  const handleJoinCommunity = async (communityId) => {
    try {
      // In a real app: POST /api/v1/communities/:id/members
      const community = communities.find(c => c.id === communityId);
      if (community && !community.members.find(m => m.id === currentUser.id)) {
        community.members.push({ id: currentUser.id, username: currentUser.username });
        setCommunities([...communities]);
        loadCommunityDetails(community);
        setMessage('✅ Hai aderito alla community!');
      }
    } catch (error) {
      setMessage('❌ Errore nell\'adesione alla community');
    }
  };

  const handleLeaveCommunity = async () => {
    try {
      // In a real app: DELETE /api/v1/communities/:id/members/:memberId
      if (selectedCommunity) {
        selectedCommunity.members = selectedCommunity.members.filter(m => m.id !== currentUser.id);
        setCommunities([...communities]);
        setSelectedCommunity(null);
        setMessage('✅ Hai lasciato la community');
      }
    } catch (error) {
      setMessage('❌ Errore nell\'abbandono della community');
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      setMessage('⚠️ Inserisci il nome del canale');
      return;
    }

    try {
      // In a real app: POST /api/v1/communities/:id/channels
      const newChannel = {
        id: Date.now(),
        name: newChannelName.toLowerCase(),
        type: newChannelType,
        members: [currentUser.id],
      };

      setChannels([...channels, newChannel]);
      if (selectedCommunity) {
        selectedCommunity.channels.push(newChannel);
      }
      
      setNewChannelName('');
      setNewChannelType('text');
      setShowCreateChannel(false);
      setMessage(`✅ Canale #${newChannelName} creato`);
    } catch (error) {
      setMessage('❌ Errore nella creazione del canale');
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      setMessage('⚠️ Inserisci il nome del ruolo');
      return;
    }

    try {
      // In a real app: POST /api/v1/communities/:id/roles
      const newRole = {
        id: Date.now(),
        name: newRoleName,
        color: newRoleColor,
        permissions: ['writeMessages', 'readMessages'],
        members: [],
      };

      setRoles([...roles, newRole]);
      if (selectedCommunity) {
        selectedCommunity.roles.push(newRole);
      }

      setNewRoleName('');
      setNewRoleColor('#00d4ff');
      setShowCreateRole(false);
      setMessage(`✅ Ruolo ${newRoleName} creato`);
    } catch (error) {
      setMessage('❌ Errore nella creazione del ruolo');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;

    try {
      // In a real app: POST /api/v1/communities/:id/channels/:channelId/messages
      const msg = {
        id: Date.now(),
        author: currentUser.username,
        authorId: currentUser.id,
        content: newMessage,
        timestamp: new Date().toISOString(),
        isPinned: false,
      };

      setMessages([...messages, msg]);
      setNewMessage('');
      setMessage('✅ Messaggio inviato');
    } catch (error) {
      setMessage('❌ Errore nell\'invio del messaggio');
    }
  };

  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
    // Mock load messages - in a real app: GET /api/v1/communities/:id/channels/:channelId/messages
    setMessages([
      {
        id: 1,
        author: 'naruto_fan',
        authorId: 1,
        content: 'Che ne pensate di questa stagione?',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        isPinned: false,
      },
      {
        id: 2,
        author: 'demon_slayer_fan',
        authorId: 2,
        content: 'Fantastica! I combattimenti sono incredibili',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        isPinned: false,
      },
    ]);
  };

  const handleKickMember = async (memberId) => {
    if (!isAdmin) {
      setMessage('❌ Non hai i permessi per questa azione');
      return;
    }

    try {
      // In a real app: POST /api/v1/communities/:id/members/:memberId/kick
      setMembers(members.filter(m => m.id !== memberId));
      if (selectedCommunity) {
        selectedCommunity.members = selectedCommunity.members.filter(m => m.id !== memberId);
      }
      setMessage('✅ Membro rimosso');
    } catch (error) {
      setMessage('❌ Errore nella rimozione del membro');
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
              .filter(c => !c.members.find(m => m.id === currentUser.id))
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
                              <strong>{msg.author}</strong>
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
