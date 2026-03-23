import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function Community() {
  const { communityId } = useParams();
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCommunityAndMembers() {
      try {
        const token = localStorage.getItem('token');
        let idToFetch = communityId;

        // Se non c'è communityId nei params, carica la prima community disponibile
        if (!communityId) {
          const listResponse = await fetch('/api/v1/communities', {
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {},
          });

          if (!listResponse.ok) {
            throw new Error('Errore nel caricamento delle community');
          }

          const listData = await listResponse.json();
          const communities = listData.communities || [];
          console.log('🔍 Community fetched:', communities);  // ← AGGIUNGI QUESTO
          
          if (communities.length === 0) {
            throw new Error('Nessuna community disponibile');
          }

          idToFetch = communities[0].id;
        }

        // Fetch community details
        const commResponse = await fetch(`/api/v1/communities/${idToFetch}`, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });

        if (!commResponse.ok) {
          let apiError = 'Community non trovata';
          try {
            const errorBody = await commResponse.json();
            if (errorBody?.error) {
              apiError = errorBody.error;
            }
          } catch {}
          throw new Error(apiError);
        }

        const commData = await commResponse.json();
        setCommunity(commData.community);

        // Fetch members
        const membersResponse = await fetch(`/api/v1/communities/${idToFetch}/members`, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });

        if (!membersResponse.ok) {
          throw new Error('Errore nel recupero dei membri della community');
        }

        const membersData = await membersResponse.json();
        setMembers(membersData.members || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCommunityAndMembers();
  }, [communityId]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">👥 Community</h5>
        </div>
        <div className="card-body text-center">
          <div className="loading">
            <span className="spinner-border text-primary me-2"></span>
            <span>Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0" style={{color: '#ff6fa0'}}>⚠️ Community</h5>
        </div>
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      </div>
    );
  }

  const isMember = community && members.some(m => m.id === JSON.parse(localStorage.getItem('user') || '{}').id);

  const handleJoinCommunity = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/communities/${communityId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to join community');
      }

      // Refresh members list
      const membersResponse = await fetch(`/api/v1/communities/${communityId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const membersData = await membersResponse.json();
      setMembers(membersData.members || []);
      alert('✅ Hai aderito alla community!');
    } catch (err) {
      alert('❌ Errore nell\'adesione: ' + err.message);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <h5 className="card-title mb-0">👥 {community?.name || 'Community'}</h5>
            <small style={{color: '#a0a0cc'}}>{community?.description || ''}</small>
          </div>
          {!isMember && (
            <button 
              className="btn btn-sm btn-primary"
              onClick={handleJoinCommunity}
            >
              ✅ Aderisci
            </button>
          )}
        </div>
      </div>
      <div className="card-body">
        {members.length === 0 ? (
          <div className="alert alert-info" role="alert">
            Nessun membro ancora.
          </div>
        ) : (
          <div>
            <p style={{color: '#00d4ff', fontWeight: 'bold', marginBottom: '1.5rem'}}>
              👥 {members.length} membro{members.length !== 1 ? 'i' : ''}
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '1rem'
            }}>
              {members.map((member) => (
                <div 
                  key={member.id} 
                  className="card" 
                  style={{textAlign: 'center', flex: 1}}
                >
                  <div className="card-body">
                    <img
                      src={member.profileImage || 'https://via.placeholder.com/80'}
                      alt={member.username}
                      className="profile-image"
                      style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        border: '2px solid #00d4ff',
                        marginBottom: '1rem'
                      }}
                    />
                    <h6 className="card-title" style={{color: '#00d4ff'}}>
                      {member.username}
                    </h6>
                    <small style={{color: '#a0a0cc'}}>
                      {member.bio || 'Nessuna bio'}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Community;
