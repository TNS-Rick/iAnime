const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Cache for geolocation and JustWatch results
const geoCache = new Map();
const jwCache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// API: piattaforme JustWatch per titolo e paese

app.get('/api/justwatch', async (req, res) => {
  const { title, country } = req.query;
  if (!title) return res.status(400).json({ error: 'Titolo richiesto' });
  let userCountry = country;
  
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  
  try {
    // Se non specificato, rileva il paese dall'IP con cache
    if (!userCountry) {
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const cachedGeo = geoCache.get(ip);
      
      if (cachedGeo && Date.now() - cachedGeo.timestamp < CACHE_TTL) {
        userCountry = cachedGeo.country;
      } else {
        // Usa ipinfo.io per geolocalizzazione gratuita (limite 50k/mese)
        const geoRes = await fetch(`https://ipinfo.io/${ip}/json?token=demo`); // Sostituisci 'demo' con un token reale se necessario
        const geoData = await geoRes.json();
        userCountry = geoData.country || 'US';
        geoCache.set(ip, { country: userCountry, timestamp: Date.now() });
      }
    }
    
    // Check JustWatch cache
    const cacheKey = `${title.toLowerCase()}_${userCountry}`;
    const cachedJW = jwCache.get(cacheKey);
    
    if (cachedJW && Date.now() - cachedJW.timestamp < CACHE_TTL) {
      return res.json({ platforms: cachedJW.platforms, country: userCountry });
    }
    
    const url = `https://apis.justwatch.com/content/titles/${userCountry.toLowerCase()}/popular?query=${encodeURIComponent(title)}`;
    const jwRes = await fetch(url);
    const jwData = await jwRes.json();
    
    let platforms = [];
    if (jwData && jwData.items && jwData.items.length > 0) {
      const offers = jwData.items[0].offers || [];
      const providers = {};
      offers.forEach(offer => {
        if (!providers[offer.provider_id]) {
          providers[offer.provider_id] = {
            name: offer.provider_id,
            url: offer.urls && offer.urls.standard_web,
            type: offer.monetization_type
          };
        }
      });
      platforms = Object.values(providers);
    }
    
    // Cache the result
    jwCache.set(cacheKey, { platforms, timestamp: Date.now() });
    return res.json({ platforms, country: userCountry });
  } catch (err) {
    return res.status(500).json({ error: 'Errore JustWatch', details: err.message });
  }
});

// Socket.io base
io.on('connection', (socket) => {
  console.log('Nuovo utente connesso');
  socket.on('disconnect', () => {
    console.log('Utente disconnesso');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
