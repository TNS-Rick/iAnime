import React, { useEffect, useState, useMemo, useRef } from 'react';
import Community from './Community';
import MerchSuggestions from './MerchSuggestions';
import StreamingPlatforms from './StreamingPlatforms';
import { useParams, useNavigate } from 'react-router-dom';

function AnimeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);

  const [jwPlatforms, setJwPlatforms] = useState([]);

  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Memoize country detection to avoid recalculation
  const userCountry = useMemo(() => {
    if (navigator.languages && navigator.languages.length) {
      return navigator.languages[0].split('-')[1] || 'US';
    }
    if (navigator.language) {
      return navigator.language.split('-')[1] || 'US';
    }
    return 'US';
  }, []);

  // Fetch anime data
  useEffect(() => {
    async function fetchAnime() {
      setLoading(true);
      setError(null);

      // Abort previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch(
          `https://api.jikan.moe/v4/anime/${id}/full`,
          { signal: abortControllerRef.current.signal }
        );
        if (!res.ok) {
          if (res.status === 429) {
            setError('Rate limit Jikan superato. Riprova tra qualche secondo.');
          } else {
            setError('Errore di rete o anime non trovato.');
          }
          setAnime(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!data.data) {
          setError('Anime non trovato.');
          setAnime(null);
          setLoading(false);
          return;
        }
        setAnime(data.data);
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError('Errore di rete.');
          setAnime(null);
        }
      }
      setLoading(false);
    }
    fetchAnime();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [id]);

  // Fetch JustWatch platforms separately when anime is loaded
  useEffect(() => {
    if (!anime || !anime.title) {
      setJwPlatforms([]);
      return;
    }

    let isCancelled = false;

    async function fetchJustWatch() {
      try {
        const apiUrl = `/api/justwatch?title=${encodeURIComponent(anime.title)}&country=${userCountry}`;
        const jwRes = await fetch(apiUrl);
        const jwData = await jwRes.json();
        
        if (!isCancelled) {
          if (jwData && jwData.platforms && jwData.platforms.length > 0) {
            setJwPlatforms(jwData.platforms);
          } else {
            setJwPlatforms([]);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setJwPlatforms([]);
        }
      }
    }

    fetchJustWatch();

    return () => {
      isCancelled = true;
    };
  }, [anime, userCountry]);

  // Placeholder prodotti e-commerce
  const products = [
    { name: 'Action Figure', img: 'https://via.placeholder.com/100', url: '#' },
    { name: 'Poster', img: 'https://via.placeholder.com/100', url: '#' },
    { name: 'T-shirt', img: 'https://via.placeholder.com/100', url: '#' },
  ];

  // Memoize platform mapping to avoid recalculation on every render
  const platformsWithLinks = useMemo(() => {
    if (jwPlatforms.length > 0) {
      // Mappa provider_id a nome leggibile (puoi espandere questa mappa)
      const providerNames = {
        'nfx': 'Netflix',
        'prv': 'Prime Video',
        'dnp': 'Disney+',
        'cru': 'Crunchyroll',
        'wki': 'Wakanim',
        'hbo': 'HBO',
        'ply': 'PlayStation',
        'yot': 'YouTube',
        'itv': 'Infinity',
        'rai': 'RaiPlay',
        'med': 'Mediaset Infinity',
        // ...aggiungi altri se necessario
      };
      return jwPlatforms.map(p => ({
        name: providerNames[p.name] || p.name,
        url: p.url
      }));
    } else if (anime?.streaming) {
      return anime.streaming.map(s => ({
        name: s.name,
        url: s.url
      }));
    }
    return [];
  }, [jwPlatforms, anime]);

  if (loading) {
    return (
      <div className="container my-5">
        <button className="btn btn-secondary mb-3" onClick={() => navigate('/')}>
          ← Torna indietro
        </button>
        <div className="loading">
          <span className="spinner-border text-primary me-2"></span>
          <span>Caricamento anime...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container my-5">
        <button className="btn btn-secondary mb-3" onClick={() => navigate('/')}>
          ← Torna indietro
        </button>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!anime) return null;

  return (
    <div className="main-container">
      <button className="btn btn-secondary mb-4" onClick={() => navigate('/')}>
        ← Torna indietro
      </button>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-4 mb-3">
              <img 
                src={anime.images?.jpg?.image_url} 
                alt={anime.title} 
                className="img-fluid rounded" 
                style={{boxShadow: '0 0 30px rgba(0, 212, 255, 0.3)'}}
              />
            </div>
            <div className="col-md-8">
              <h2 style={{background: 'linear-gradient(135deg, #00d4ff 0%, #ff006e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                {anime.title}
              </h2>
              <div className="mb-3">
                {anime.score && (
                  <span className="badge me-2" style={{background: 'linear-gradient(135deg, #00d4ff 0%, #8338ec 100%)'}}>
                    ⭐ {anime.score}/10
                  </span>
                )}
                {anime.status && (
                  <span className="badge" style={{background: 'linear-gradient(135deg, #ff006e 0%, #ffd60a 100%)'}}>
                    {anime.status}
                  </span>
                )}
              </div>
              <p style={{color: '#a0a0cc', fontSize: '1.1rem', lineHeight: '1.6'}}>
                {anime.synopsis}
              </p>
              {anime.episodes && (
                <p style={{color: '#00d4ff'}}>
                  <strong>Episodi:</strong> {anime.episodes}
                </p>
              )}
              {anime.aired?.from && (
                <p style={{color: '#00d4ff'}}>
                  <strong>Anno:</strong> {new Date(anime.aired.from).getFullYear()}
                </p>
              )}
              <StreamingPlatforms platforms={platformsWithLinks} />
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">📺 Informazioni Aggiuntive</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              {anime.genres && anime.genres.length > 0 && (
                <div className="mb-3">
                  <strong style={{color: '#00d4ff'}}>Generi:</strong>
                  <div style={{marginTop: '0.5rem'}}>
                    {anime.genres.map(g => (
                      <span key={g.mal_id} className="badge me-2" style={{background: 'rgba(131, 56, 236, 0.5)', border: '1px solid #8338ec'}}>
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="col-md-6">
              {anime.studios && anime.studios.length > 0 && (
                <div className="mb-3">
                  <strong style={{color: '#00d4ff'}}>Studio:</strong>
                  <p>{anime.studios.map(s => s.name).join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <hr />
      <h3 className="text-primary mb-4">👥 Community</h3>
      <Community />

      <hr />
      <h3 className="text-primary mb-4">🛍️ Prodotti Consigliati</h3>
      <div className="row">
        {products.map((prod, idx) => (
          <div className="col-md-4 col-sm-6 mb-3" key={idx}>
            <a href={prod.url} target="_blank" rel="noopener noreferrer" className="card" style={{textDecoration: 'none'}}>
              <img src={prod.img} alt={prod.name} className="card-img-top" />
              <div className="card-body text-center">
                <h6 className="card-title">{prod.name}</h6>
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AnimeDetail;
