# iAnime - Documentazione tecnica

## Panoramica
iAnime e una web app full-stack per la scoperta di anime, la gestione di community, la chat real-time e le impostazioni utente. Lo stato attuale del repository usa React sul frontend, Express e Socket.io sul backend e MySQL/MariaDB per la persistenza dati.

## Stato attuale del codice
- Frontend: React 18, React Router, Bootstrap, socket.io-client.
- Backend: Node.js, Express 5, Socket.io, bcryptjs, jsonwebtoken.
- Database: MySQL via mysql2 con schema creato all'avvio dal backend.
- Integrazioni esterne: Jikan per la ricerca anime e JustWatch per le piattaforme streaming.
- Modello dati: tabelle users, animes, communities, roles, channels, channel_groups, messages, direct_messages, friendships.

Nota: alcuni documenti storici del repository parlano di MongoDB o di una documentazione runtime separata; nel codice attivo il server principale monta solo gli endpoint definiti in server/index.js.

## Struttura del repository
- client/: interfaccia React.
- server/: API Express, socket real-time, schema MySQL e seed.
- server/models/: layer di accesso ai dati usato dai router.
- server/db/: connessione, schema e inizializzazione database.
- server/api/: router HTTP per auth, community e test.
- viste.sql: artefatto SQL presente nel workspace.

## Flusso applicativo
### Avvio backend
1. server/index.js avvia Express e HTTP server.
2. Viene inizializzato il database con server/db/seed.js.
3. La connessione MySQL viene aperta da server/db/connection.js.
4. Vengono registrati i router /api/auth, /api, /api/test e Socket.io.

### Avvio frontend
1. client/src/App.js verifica il token salvato nel browser.
2. Se la sessione e valida, il client riconnette Socket.io.
3. Se non c'e autenticazione, mostra login o registrazione.
4. Le route principali sono /, /anime/:id, /community, /community/:communityId, /social, /settings, /test.

## Funzionalita principali
### Ricerca anime
- Il componente client/src/components/AnimeSearch.js interroga Jikan direttamente.
- La ricerca e debounced e cancellabile con AbortController.
- I risultati portano al dettaglio anime tramite client/src/components/AnimeDetail.js.

### Community
- client/src/components/CommunityDashboard.js gestisce elenco community, canali, messaggi, ruoli e membri.
- Il backend espone endpoint per creare, aggiornare, eliminare e lasciare community.
- I canali supportano lettura, creazione, aggiornamento, eliminazione e posting messaggi.

### Social
- client/src/components/SocialDashboard.js gestisce ricerca utenti, richieste amicizia, amici e blocchi.
- Gli endpoint supportano ricerca utenti per username, profilo utente, amicizie e block/unblock.
- Le chat private usano Socket.io per invio e ricezione messaggi real-time.

### Impostazioni
- client/src/components/Settings.js raccoglie impostazioni account e applicazione.
- Il backend consente aggiornamento profilo, cambio password e persistenza di preferenze come tema, display mode, accessibilita, audio e 2FA.

## Endpoint HTTP principali
### Auth
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me
- PUT /api/v1/auth/profile
- POST /api/v1/auth/change-password
- POST /api/v1/auth/logout

### Community e canali
- GET /api/v1/communities
- GET /api/v1/communities/:id
- POST /api/v1/communities
- PUT /api/v1/communities/:id
- DELETE /api/v1/communities/:id
- POST /api/v1/communities/:id/join
- POST /api/v1/communities/:id/leave
- GET /api/v1/communities/:communityId/channels
- POST /api/v1/communities/:communityId/channels
- GET /api/v1/channels/:id
- PUT /api/v1/channels/:id
- DELETE /api/v1/channels/:id
- GET /api/v1/channels/:id/messages
- POST /api/v1/channels/:id/messages
- PUT /api/v1/messages/:id
- DELETE /api/v1/messages/:id

### Social e utenti
- GET /api/v1/friendships/requests
- GET /api/v1/friendships
- POST /api/v1/friendships
- POST /api/v1/friendships/:id/accept
- POST /api/v1/friendships/:id/reject
- GET /api/v1/users/search
- GET /api/v1/users/:id
- GET /api/v1/users/blocked/list
- POST /api/v1/users/:id/block
- DELETE /api/v1/users/:id/block

### Extra
- GET /api/health
- GET /api/justwatch

## Socket.io
### Eventi client -> server
- user-join: registra l'utente connesso.
- send-message: invia un messaggio a un canale.
- send-dm: invia un messaggio diretto.
- user-typing: notifica che l'utente sta scrivendo.
- join-channel: entra in una room del canale.
- leave-channel: esce dalla room del canale.

### Eventi server -> client
- user-online
- user-offline
- channel-<id>
- receive-dm
- dm-sent
- typing-<channelId>

## Modello dati
### users
Contiene credenziali, profilo, preferenze, sicurezza, premium e liste JSON come amici, bloccati e community.

### animes
Contiene metadati anime, link a provider esterni, piattaforme e hashtag.

### communities
Contiene nome, admin, ruoli, categorie, gruppi canali, membri e messaggi pinnati.

### roles
Contiene nome, permessi, colore e membri associati.

### channels
Contiene tipo canale, hashtag, limiti membri, permessi, messaggi e membri.

### channel_groups
Contiene gruppi organizzativi dei canali.

### messages
Contiene contenuto, autore, canale o sessione DM, timestamp, pin e reactions.

### direct_messages
Contiene i partecipanti e la cronologia delle chat private.

### friendships
Contiene richiesta, destinatario e stato pending, accepted, blocked.

## Setup locale
1. Avvia MySQL/MariaDB sulla porta 3306.
2. Installa le dipendenze del server con cd server && npm install.
3. Popola il database con npm run seed.
4. Avvia il backend con npm start.
5. Installa le dipendenze del client con cd client && npm install.
6. Avvia il frontend con npm start.

## Note operative
- La configurazione DB attuale e in server/db/connection.js.
- Il client usa il proxy http://localhost:5000.
- La documentazione JSON runtime presente in server/api/dataApi.js non risulta montata dall'entrypoint attuale server/index.js.
- Se vuoi allineare i documenti storici al codice reale, conviene aggiornare anche server/README.md e client/README.md.