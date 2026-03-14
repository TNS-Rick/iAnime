import React, { useEffect, useState } from 'react';

function Community() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const response = await fetch('/api/v1/communities/1/members', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (!response.ok) {
          throw new Error('Errore nel recupero dei membri della community');
        }
        const data = await response.json();
        setMembers(data.members);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, []);

  if (loading) return <div>Caricamento membri...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="card my-4">
      <div className="card-body">
        <h2 className="card-title">Community</h2>
        <ul className="list-group">
          {members.map((member) => (
            <li key={member.id} className="list-group-item">
              <img
                src={member.profileImage || 'https://via.placeholder.com/50'}
                alt={member.username}
                className="rounded-circle me-2"
                style={{ width: '50px', height: '50px' }}
              />
              {member.username}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Community;
