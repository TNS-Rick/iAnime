import React, { useEffect, useState, useMemo, useRef } from 'react';
import Community from './Community';
import MerchSuggestions from './MerchSuggestions';
import StreamingPlatforms from './StreamingPlatforms';
import { useParams } from 'react-router-dom';

function AnimeDetail() {
  const { id } = useParams();
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

  if (loading) return <div className="text-center my-5">Caricamento...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!anime) return null;

  return (
    <div className="container my-4">
      <div className="row">
        <div className="col-md-4">
          <img src={anime.images?.jpg?.image_url} alt={anime.title} className="img-fluid rounded mb-3" />
        </div>
        <div className="col-md-8">
          <h2>{anime.title}</h2>
          <p>{anime.synopsis}</p>
          <StreamingPlatforms platforms={platformsWithLinks} />
        </div>
      </div>
      <hr />
      <h4>Community</h4>
      <Community />
      <hr />
      <h4>Prodotti consigliati</h4>
      <div className="row">
        {products.map((prod, idx) => (
          <div className="col-4 col-md-2 text-center" key={idx}>
            <a href={prod.url} target="_blank" rel="noopener noreferrer">
              <img src={prod.img} alt={prod.name} className="img-thumbnail mb-2" />
              <div>{prod.name}</div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AnimeDetail;
