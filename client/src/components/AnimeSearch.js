import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function AnimeSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    setIsSearching(true);

    try {
      const response = await fetch(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchQuery)}&limit=10`,
        { signal: abortControllerRef.current.signal }
      );
      const data = await response.json();
      if (data.data) {
        setResults(data.data.map(anime => ({
          id: anime.mal_id,
          title: anime.title,
          image: anime.images?.jpg?.image_url,
          synopsis: anime.synopsis,
          rating: anime.score,
        })));
      } else {
        setResults([]);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch(query);
  };

  // Debounced search on input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced search
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 500);
  };

  return (
    <div className="anime-search-container">
      <div className="card mb-4">
        <div className="card-body">
          <form className="d-flex gap-2 mb-3" onSubmit={handleSearch}>
            <input
              type="text"
              className="form-control"
              placeholder="Scrivi il nome di un anime..."
              value={query}
              onChange={handleInputChange}
              aria-label="Ricerca anime"
            />
            <button type="submit" className="btn btn-primary" disabled={isSearching}>
              {isSearching ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Cerca...
                </>
              ) : (
                <>🔍 Cerca</>
              )}
            </button>
          </form>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="anime-grid">
          {results.map((anime) => (
            <div 
              key={anime.id} 
              className="card anime-card"
              onClick={() => navigate(`/anime/${anime.id}`)}
              style={{ cursor: 'pointer' }}
            >
              {anime.image && (
                <div style={{ position: 'relative', overflow: 'hidden', height: '250px' }}>
                  <img 
                    src={anime.image} 
                    alt={anime.title} 
                    className="img-fluid" 
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  />
                  {anime.rating && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(0, 212, 255, 0.8)',
                      color: '#000',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '5px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold'
                    }}>
                      ⭐ {anime.rating}
                    </div>
                  )}
                </div>
              )}
              <div className="card-body">
                <h5 className="card-title">{anime.title}</h5>
                {anime.synopsis && (
                  <p className="card-text" style={{ fontSize: '0.9em', color: '#a0a0cc', height: '80px', overflow: 'hidden' }}>
                    {anime.synopsis.slice(0, 200)}...
                  </p>
                )}
              </div>
              <div className="card-footer" style={{ background: 'transparent', borderTop: '1px solid rgba(0,212,255,0.2)' }}>
                <small className="text-muted">Clicca per dettagli →</small>
              </div>
            </div>
          ))}
        </div>
      ) : query ? (
        <div className="alert alert-info" role="alert">
          💭 Nessun anime trovato. Prova con un altro titolo!
        </div>
      ) : null}
    </div>
  );
}

export default AnimeSearch;
