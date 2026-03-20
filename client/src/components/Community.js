import React, { useEffect, useState } from 'react';

function Community() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/v1/communities/1/members', {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });
        if (!response.ok) {
          let apiError = 'Errore nel recupero dei membri della community';
          try {
            const errorBody = await response.json();
            if (errorBody?.error) {
              apiError = errorBody.error;
            }
          } catch {
            // Keep default message when response is not JSON.
          }
          throw new Error(apiError);
        }
        const data = await response.json();
        setMembers(data.members || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, []);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">👥 Naruto Central Community</h5>
        </div>
        <div className="card-body text-center">
          <div className="loading">
            <span className="spinner-border text-primary me-2"></span>
            <span>Caricamento membri...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0" style={{color: '#ff6fa0'}}>⚠️ Naruto Central Community</h5>
        </div>
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">👥 Naruto Central Community</h5>
        <small style={{color: '#a0a0cc'}}>Comunità ufficiale per i fan di Naruto</small>
      </div>
      <div className="card-body">
        {members.length === 0 ? (
          <div className="alert alert-info" role="alert">
            Nessun membro trovato.
          </div>
        ) : (
          <div>
            <p style={{color: '#00d4ff', fontWeight: 'bold', marginBottom: '1.5rem'}}>
              👥 {members.length} membro{members.length !== 1 ? 'i' : ''} online
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
                      ID: {member.id}
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
