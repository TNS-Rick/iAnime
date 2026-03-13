# iAnime Server

Backend Node.js/Express per l'app iAnime con persistenza MySQL tramite query SQL raw (`mysql2`).

## Funzionalità previste
- API ricerca anime
- API piattaforme streaming
- API community/chat
- API suggerimenti merchandising

## Data API tra backend e database
- Endpoint health: `/api/health`
- Documentazione JSON live: `/api/docs`
- Documentazione Markdown: [API_ENDPOINTS.md](API_ENDPOINTS.md)
- CRUD REST verso MySQL: `/api/v1/*`
- Auth JWT: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`

Questa API è il livello intermedio tra la logica backend e i dati nel database.
L'autorizzazione dipende dall'utente autenticato e dai permessi nella community.
