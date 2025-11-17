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
    <div className="container my-4">
      <form className="row g-2 align-items-center mb-4" onSubmit={handleSearch}>
        <div className="col-auto flex-grow-1">
          <input
            type="text"
            className="form-control"
            placeholder="Cerca un anime..."
            value={query}
            onChange={handleInputChange}
          />
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-primary" disabled={isSearching}>
            {isSearching ? 'Cercando...' : 'Cerca'}
          </button>
        </div>
      </form>
      <div className="row">
        {results.map((anime) => (
          <div key={anime.id} className="col-md-6 col-lg-4 mb-4">
            <div className="card h-100 shadow-sm" style={{cursor: 'pointer'}} onClick={() => navigate(`/anime/${anime.id}`)}>
              {anime.image && (
                <img src={anime.image} alt={anime.title} className="card-img-top" style={{objectFit: 'cover', height: '250px'}} />
              )}
              <div className="card-body">
                <h5 className="card-title">{anime.title}</h5>
                {anime.synopsis && (
                  <p className="card-text" style={{fontSize: '0.95em', color: '#555'}}>{anime.synopsis.slice(0, 180)}...</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AnimeSearch;
