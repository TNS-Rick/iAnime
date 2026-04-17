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

## Configurazione database locale (XAMPP)

Il backend supporta solo MySQL/MariaDB, non MongoDB.

Per la verifica 2FA via email devi configurare anche SMTP nel file `.env` del server:

- `SMTP_HOST=smtp.tuoprovider.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=tuo_utente_smtp`
- `SMTP_PASS=tua_password_smtp`
- `SMTP_FROM=no-reply@ianime.local`

Se queste variabili mancano, la setup 2FA email risponderà con un errore esplicito invece di non inviare nulla.

1. Avvia MySQL da XAMPP Control Panel.
2. Configura il file `.env` in `server/` con:
	- `DB_HOST=localhost`
	- `DB_PORT=3306`
	- `DB_USER=root`
	- `DB_PASSWORD=` (vuota se non modificata)
	- `DB_NAME=ianime`
3. Esegui `npm run seed` per creare schema e dati iniziali.
4. Esegui `npm start` per avviare il server.
