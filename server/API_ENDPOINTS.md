# iAnime Data API

Questa API REST fa da tramite tra il backend Express e il database MySQL.

## Autenticazione e autorizzazione

- Alla creazione di un utente viene generato un **JWT**.
- Il JWT identifica l'utente nelle richieste successive.
- Gli endpoint protetti richiedono header:
  - `Authorization: Bearer <token>`
- I permessi dipendono da:
  - identità dell'utente autenticato
  - ruolo nella community
  - permessi del ruolo nella community
  - proprietà della risorsa

Esempi:
- un utente può modificare solo il proprio profilo
- solo l'admin di una community può modificarla o eliminarla
- un admin o un ruolo con permesso `kick` può espellere membri
- un admin di una community non può modificare una community diversa se non è admin anche lì

## Endpoint di servizio

### GET /api/health
- Scopo: verifica rapida che il server sia avviato.
- Response 200:
```json
{
  "status": "ok",
  "service": "iAnime API",
  "timestamp": "2026-03-13T12:00:00.000Z"
}
```

### GET /api/docs
- Scopo: restituisce la documentazione JSON di tutti gli endpoint.
- Response 200: oggetto JSON con lista completa degli endpoint.

### POST /api/auth/register
- Scopo: crea un utente e restituisce subito il JWT.
- Body minimo:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "my_user"
}
```
- Response 201:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "my_user"
  },
  "token": "jwt-token"
}
```

### POST /api/auth/login
- Scopo: autentica un utente esistente e restituisce il JWT.
- Body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### GET /api/auth/me
- Scopo: restituisce l'utente associato al JWT corrente.
- Auth: Bearer token richiesto.

### GET /api/justwatch?title=<titolo>&country=<paese>
- Scopo: recupera le piattaforme streaming per un anime.
- Query params:
  - `title` obbligatorio
  - `country` opzionale
- Response 200:
```json
{
  "platforms": [],
  "country": "IT"
}
```

---

## Endpoint CRUD risorse database

Ogni risorsa espone 5 endpoint standard:
- `GET /api/v1/<risorsa>`
- `GET /api/v1/<risorsa>/:id`
- `POST /api/v1/<risorsa>`
- `PUT /api/v1/<risorsa>/:id`
- `DELETE /api/v1/<risorsa>/:id`

### Convenzioni generali
- `GET /api/v1/<risorsa>` supporta:
  - `limit` opzionale, default `50`, massimo `100`
  - `offset` opzionale, default `0`
- `DELETE` esegue una **soft delete** valorizzando `deletedAt`
- i campi JSON vanno inviati come normali array/oggetti JSON nel body
- gli endpoint `POST`, `PUT`, `DELETE` sono protetti da JWT, tranne la creazione utente

## Endpoint permessi community

### GET /api/v1/communities/:id/permissions/me
- Scopo: restituisce i permessi dell'utente autenticato all'interno della community.
- Auth: Bearer token richiesto.
- Response 200:
```json
{
  "communityId": 10,
  "userId": 3,
  "isAdmin": false,
  "permissions": ["kick", "manageChannels"],
  "capabilities": {
    "kick": true,
    "deleteMsg": false,
    "mute": false,
    "manageRoles": false,
    "manageChannels": true,
    "manageCategories": false,
    "pinMessages": false
  }
}
```

### POST /api/v1/communities/:id/members/:memberId/kick
- Scopo: espelle un membro dalla community.
- Auth: Bearer token richiesto.
- Autorizzazione: consentito solo all'admin della community o a chi ha permesso `kick`.

---

## 1. Users
Base path: `/api/v1/users`

### GET /api/v1/users
- Elenca gli utenti non eliminati.

### GET /api/v1/users/:id
- Recupera un utente per ID.

### POST /api/v1/users
- Crea un utente e restituisce anche un JWT.
- Campi obbligatori:
  - `email`
  - `password`
  - `username`

### PUT /api/v1/users/:id
- Aggiorna un utente.
- Auth: Bearer token richiesto.
- Autorizzazione: l'utente può modificare solo sé stesso.
- Campi aggiornabili:
  - `email`, `password`, `username`, `bio`, `profileImage`, `displayNameColor`, `profileFrameStyle`
  - `theme`, `displayMode`, `language`, `notifications`
  - `isPremium`, `premiumExpiresAt`, `billingMethod`
  - `twoFAEnabled`, `twoFAMethod`, `twoFASecret`
  - `whoCanInvite`, `acceptStrangerMessages`
  - `friendsList`, `blockedUsers`, `communities`
  - `colorblindMode`, `highContrast`, `textSize`
  - `audioInputDevice`, `audioOutputDevice`, `volume`
  - `lastUsernameChange`

### DELETE /api/v1/users/:id
- Soft delete di un utente.
- Auth: Bearer token richiesto.
- Autorizzazione: l'utente può eliminare solo sé stesso.

---

## 2. Animes
Base path: `/api/v1/animes`

### GET /api/v1/animes
- Elenca gli anime non eliminati.

### GET /api/v1/animes/:id
- Recupera un anime per ID.

### POST /api/v1/animes
- Crea un anime.
- Auth: Bearer token richiesto.
- Campi obbligatori:
  - `title`
  - `platforms`
  - `hashtags`

### PUT /api/v1/animes/:id
- Aggiorna un anime.
- Auth: Bearer token richiesto.
- Campi aggiornabili:
  - `title`, `description`, `coverImage`, `rating`, `category`, `status`
  - `jikanId`, `anilistId`, `kitsuId`
  - `platforms`, `hashtags`, `followedByCount`

### DELETE /api/v1/animes/:id
- Soft delete di un anime.
- Auth: Bearer token richiesto.

---

## 3. Roles
Base path: `/api/v1/roles`

### GET /api/v1/roles
- Elenca i ruoli non eliminati.

### GET /api/v1/roles/:id
- Recupera un ruolo per ID.

### POST /api/v1/roles
- Crea un ruolo.
- Auth: Bearer token richiesto.
- Campi obbligatori:
  - `name`
  - `permissions`
  - `members`

### PUT /api/v1/roles/:id
- Aggiorna un ruolo.
- Auth: Bearer token richiesto.
- Campi aggiornabili:
  - `name`, `permissions`, `color`, `members`

### DELETE /api/v1/roles/:id
- Soft delete di un ruolo.
- Auth: Bearer token richiesto.

---

## 4. Channels
Base path: `/api/v1/channels`

### GET /api/v1/channels
- Elenca i canali non eliminati.

### GET /api/v1/channels/:id
- Recupera un canale per ID.

### POST /api/v1/channels
- Crea un canale.
- Auth: Bearer token richiesto.
- Campi obbligatori:
  - `name`
  - `type`
  - `hashtags`
  - `permissions`
  - `messages`
  - `members`

### PUT /api/v1/channels/:id
- Aggiorna un canale.
- Auth: Bearer token richiesto.
- Campi aggiornabili:
  - `name`, `type`, `hashtags`, `maxMembers`, `permissions`, `messages`, `members`

### DELETE /api/v1/channels/:id
- Soft delete di un canale.
- Auth: Bearer token richiesto.

---

## 5. Channel Groups
Base path: `/api/v1/channel-groups`

### GET /api/v1/channel-groups
- Elenca i gruppi di canali non eliminati.

### GET /api/v1/channel-groups/:id
- Recupera un gruppo di canali per ID.

### POST /api/v1/channel-groups
- Crea un gruppo di canali.
- Auth: Bearer token richiesto.
- Campi obbligatori:
  - `name`
  - `channels`

### PUT /api/v1/channel-groups/:id
- Aggiorna un gruppo di canali.
- Auth: Bearer token richiesto.
- Campi aggiornabili:
  - `name`, `channels`

### DELETE /api/v1/channel-groups/:id
- Soft delete di un gruppo di canali.
- Auth: Bearer token richiesto.

---

## 6. Communities
Base path: `/api/v1/communities`

### GET /api/v1/communities
- Elenca le community non eliminate.

### GET /api/v1/communities/:id
- Recupera una community per ID.

### POST /api/v1/communities
- Crea una community.
- Auth: Bearer token richiesto.
- Autorizzazione: `adminId` viene impostato automaticamente con l'utente autenticato.
- Campi obbligatori:
  - `name`
  - `roles`
  - `categories`
  - `channelGroups`
  - `members`
  - `pinnedMessages`

### PUT /api/v1/communities/:id
- Aggiorna una community.
- Auth: Bearer token richiesto.
- Autorizzazione: solo l'admin della community può modificarla.
- Campi aggiornabili:
  - `name`, `description`, `adminId`, `roles`, `categories`, `channelGroups`, `members`, `pinnedMessages`

### DELETE /api/v1/communities/:id
- Soft delete di una community.
- Auth: Bearer token richiesto.
- Autorizzazione: solo l'admin della community può eliminarla.

---

## 7. Direct Messages
Base path: `/api/v1/direct-messages`

### GET /api/v1/direct-messages
- Elenca le sessioni DM non eliminate.

### GET /api/v1/direct-messages/:id
- Recupera una sessione DM per ID.

### POST /api/v1/direct-messages
- Crea una sessione DM.
- Auth: Bearer token richiesto.
- Autorizzazione: l'utente autenticato deve essere presente tra i partecipanti.
- Campi obbligatori:
  - `participants`
  - `messages`

### PUT /api/v1/direct-messages/:id
- Aggiorna una sessione DM.
- Auth: Bearer token richiesto.
- Autorizzazione: solo un partecipante può modificarla.
- Campi aggiornabili:
  - `participants`, `messages`

### DELETE /api/v1/direct-messages/:id
- Soft delete di una sessione DM.
- Auth: Bearer token richiesto.

---

## 8. Messages
Base path: `/api/v1/messages`

### GET /api/v1/messages
- Elenca i messaggi non eliminati.

### GET /api/v1/messages/:id
- Recupera un messaggio per ID.

### POST /api/v1/messages
- Crea un messaggio.
- Auth: Bearer token richiesto.
- Autorizzazione: `authorId` viene impostato automaticamente con l'utente autenticato.
- Campi obbligatori:
  - `content`
  - `reactions`
  - `mentions`

### PUT /api/v1/messages/:id
- Aggiorna un messaggio.
- Auth: Bearer token richiesto.
- Autorizzazione: solo l'autore può modificarlo.
- Campi aggiornabili:
  - `content`, `authorId`, `channelId`, `dmSessionId`, `timestamp`, `isPinned`, `reactions`, `mentions`

### DELETE /api/v1/messages/:id
- Soft delete di un messaggio.
- Auth: Bearer token richiesto.
- Autorizzazione: solo l'autore può eliminarlo.

---

## 9. Friendships
Base path: `/api/v1/friendships`

### GET /api/v1/friendships
- Elenca le amicizie non eliminate.

### GET /api/v1/friendships/:id
- Recupera una amicizia per ID.

### POST /api/v1/friendships
- Crea una amicizia.
- Auth: Bearer token richiesto.
- Autorizzazione: `requester` viene impostato automaticamente con l'utente autenticato.
- Campi obbligatori:
  - `recipient`
  - `status`

### PUT /api/v1/friendships/:id
- Aggiorna una amicizia.
- Auth: Bearer token richiesto.
- Autorizzazione: solo requester o recipient possono modificarla.
- Campi aggiornabili:
  - `requester`, `recipient`, `status`

### DELETE /api/v1/friendships/:id
- Soft delete di una amicizia.
- Auth: Bearer token richiesto.
- Autorizzazione: solo requester o recipient possono eliminarla.
