# iAnime - Documentazione Tecnica per Sviluppatori

## Sommario

- [Panoramica](#panoramica)
- [Stack Tecnologico](#stack-tecnologico)
- [Struttura del Progetto](#struttura-del-progetto)
- [Architettura Applicativa](#architettura-applicativa)
- [Setup Ambiente di Sviluppo](#setup-ambiente-di-sviluppo)
- [Modello Dati](#modello-dati)
- [API REST](#api-rest)
- [Real-time Communication](#real-time-communication)
- [Autenticazione e Autorizzazione](#autenticazione-e-autorizzazione)
- [Integrazione API Esterne](#integrazione-api-esterne)
- [Build e Deployment](#build-e-deployment)
- [Testing](#testing)
- [Performance](#performance)
- [Sicurezza](#sicurezza)
- [Troubleshooting Sviluppatori](#troubleshooting-sviluppatori)

---

## Panoramica

**iAnime** è una piattaforma full-stack per la scoperta di anime, la gestione di community, la chat real-time e la socialità tra fan. 

### Principi Architetturali

- **Decoupled Client-Server**: Frontend e backend completamente separati
- **Real-time First**: Socket.io per comunicazione real-time istantanea
- **Scalabilità**: Pronto per deployment cloud e load balancing
- **Security-First**: JWT, 2FA, password hashing, CORS configurato
- **Data Persistence**: MySQL con schema relazionale normalizzato

### Diagramma Architetturale

```
┌──────────────────────────────────────┐
│         Frontend (React 18)          │
│  • AnimeSearch, AnimeDetail          │
│  • Community, SocialDashboard        │
│  • Settings, Auth                    │
└──────────┬───────────────────────────┘
           │ HTTP + WebSocket (Socket.io)
           ▼
┌──────────────────────────────────────┐
│    Backend (Express.js + Socket.io)  │
│  • Authentication & JWT              │
│  • Community Management              │
│  • Real-time Chat                    │
│  • Social Features                   │
│  • External API Integration          │
└──────────┬───────────────────────────┘
           │ MySQL Protocol
           ▼
┌──────────────────────────────────────┐
│   Database (MySQL/MariaDB)           │
│  • Users, Communities, Messages      │
│  • Channels, Roles, Relationships    │
└──────────────────────────────────────┘
```

---

## Stack Tecnologico

### Frontend

| Tecnologia | Versione | Ruolo | Perché |
|---|---|---|---|
| **React** | 18.3.1 | UI Framework | SPA reattivo, component-based |
| **React Router** | 6.30.1 | Routing SPA | Navigation client-side |
| **Bootstrap** | 5.3.8 | CSS Framework | Responsive design preconfezionato |
| **Socket.io Client** | 4.8.3 | Real-time Communication | WebSocket + fallback polling |
| **Axios** | Implicito | HTTP Client | Chiamate API (via fetch wrapper) |
| **js-cookie** | Implicito | Token Storage | Persistenza JWT in cookie |

**Build Tool**: Create React App con react-scripts

### Backend

| Tecnologia | Versione | Ruolo | Perché |
|---|---|---|---|
| **Node.js** | 18.x+ | Runtime | JavaScript lato server |
| **Express.js** | 5.1.0 | Web Framework | Routing, middleware, HTTP server |
| **Socket.io** | 4.8.1 | Real-time Communication | WebSocket gestito, event-driven |
| **mysql2** | 3.19.1 | MySQL Driver | Connection pooling, async/await |
| **bcryptjs** | 3.0.3 | Password Hashing | One-way password encryption |
| **jsonwebtoken (JWT)** | 9.0.3 | Authentication Token | Stateless authentication |
| **dotenv** | 17.3.1 | Environment Variables | Config da .env |
| **cors** | 2.8.5 | Cross-Origin | Gestione richieste cross-domain |
| **nodemailer** | 8.0.5 | Email Sending | 2FA codes e reset password |
| **qrcode** | 1.5.4 | QR Code Generation | 2FA setup con authenticator app |
| **speakeasy** | 2.0.0 | TOTP Generation | RFC 4226 TOTP per 2FA |

**Package Manager**: npm

### Database

| Tecnologia | Versione | Ruolo |
|---|---|---|
| **MySQL** | 5.7+ / 8.0 | RDBMS con InnoDB |
| **MariaDB** | 10.5+ | Alternativa MySQL-compatible |

**Charset**: UTF-8 MB4 (supporta emoji e caratteri speciali)

---

## Struttura del Progetto

```
iAnime/
│
├── client/                           # React Frontend
│   ├── public/
│   │   ├── index.html               # HTML entry point
│   │   └── style.css                # CSS globale
│   ├── src/
│   │   ├── components/              # React componenti
│   │   │   ├── AnimeSearch.js       # Ricerca anime + lista risultati
│   │   │   ├── AnimeDetail.js       # Dettagli singolo anime + piattaforme
│   │   │   ├── Community.js         # Vista comunità (canali + messaggi)
│   │   │   ├── CommunityDashboard.js# Gestione community
│   │   │   ├── SocialDashboard.js   # Amici, DM, profili
│   │   │   ├── Settings.js          # Account + app settings
│   │   │   ├── Login.js             # Form login + 2FA
│   │   │   ├── Register.js          # Form registrazione
│   │   │   ├── TwoFactorSetup.js    # Setup 2FA wizard
│   │   │   ├── MerchSuggestions.js  # Suggerimenti merchandise
│   │   │   ├── StreamingPlatforms.js# Piattaforme streaming
│   │   │   ├── TestPage.js          # Test/debug page
│   │   │   └── Auth.css             # Styling per auth
│   │   ├── services/
│   │   │   └── api.js               # API client + Socket.io wrapper
│   │   ├── utils/
│   │   │   └── animeTags.js         # Helper functions
│   │   ├── App.js                   # Root component + routing
│   │   ├── index.js                 # React DOM render
│   │   └── index.css                # Styling globale
│   ├── build/                       # Produzione build (gitignored)
│   ├── package.json                 # Frontend dependencies
│   └── README.md                    # Frontend setup instructions
│
├── server/                          # Express Backend
│   ├── api/
│   │   ├── auth.js                  # Autenticazione logic (JWT, 2FA, hashing)
│   │   ├── authEndpoints.js         # HTTP routes: /api/v1/auth/*
│   │   ├── communityEndpoints.js    # HTTP routes: communities (v1)
│   │   ├── communityEndpointsV2.js  # HTTP routes: communities (v2, latest)
│   │   ├── dataApi.js               # Runtime documentation (legacy)
│   │   ├── resources.js             # Helper functions per endpoints
│   │   ├── testEndpoints.js         # Routes di test/debug
│   │   └── index.js                 # Router exports
│   ├── db/
│   │   ├── connection.js            # MySQL connection pool setup
│   │   ├── schema.js                # CREATE TABLE statements
│   │   ├── seed.js                  # Database initialization + seed data
│   │   └── README.md                # Database documentation
│   ├── models/
│   │   ├── User.js                  # User CRUD operations
│   │   ├── Community.js             # Community CRUD operations
│   │   ├── Channel.js               # Channel CRUD operations
│   │   ├── ChannelGroup.js          # Channel group operations
│   │   ├── Message.js               # Message CRUD operations
│   │   ├── DirectMessage.js         # DM session operations
│   │   ├── Role.js                  # Role CRUD operations
│   │   ├── Friendship.js            # Friendship operations
│   │   ├── Anime.js                 # Anime CRUD operations
│   │   └── index.js                 # Models export
│   ├── index.js                     # Server entry point
│   ├── package.json                 # Backend dependencies
│   └── README.md                    # Backend setup instructions
│
├── docs/
│   ├── USER_DOCUMENTATION.md        # Guida utenti (NEW)
│   ├── DEVELOPER_GUIDE.md           # Guida sviluppatori (THIS FILE)
│   ├── ARCHITETTURA.md              # Architettura progetto (legacy)
│   └── USER_GUIDE.md                # User guide (legacy)
│
├── README.md                        # Project README
├── API_ENDPOINTS.md                 # Endpoint documentation
├── viste.sql                        # SQL views (legacy artifact)
├── er.drawio.png                    # Entity-Relationship diagram
├── casi_uso.drawio.png              # Use cases diagram
└── .gitignore                       # Git ignore rules
```

---

## Architettura Applicativa

### Flow Applicativo

#### Avvio Backend

```
1. server/index.js eseguito
2. Connessione MySQL inizializzata
3. Database schema creato (se non esiste)
4. Express server avviato on port 5000
5. Socket.io server istanziato
6. Router registrati:
   - /api/v1/auth/* (auth endpoints)
   - /api/v1/communities/* (community endpoints)
   - /api/* (test endpoints)
7. Listening on http://0.0.0.0:5000
```

#### Avvio Frontend

```
1. client/src/index.js eseguito
2. React app mountato nel DOM
3. App.js carica e verifica token salvato
4. Se token valido:
   - Utente automaticamente loggato
   - Socket.io connesso con userId
5. Se token invalido:
   - Redirect a Login/Register
6. React Router attiva il routing client-side
```

#### User Login Flow

```
1. User compila form login (email, password)
2. POST /api/v1/auth/login
3. Backend:
   - Valida email exists
   - Valida password con bcrypt.compare()
   - Se 2FA enabled: genera challenge e invia codice
   - Altrimenti: genera JWT
4. Frontend riceve token
5. Token salvato in localStorage
6. Socket.io riconnette come utente autenticato
7. Dashboard carica
```

#### Real-time Message Flow

```
1. User scrive messaggio in canale
2. Frontend emette socket event: send-message
   {content, channelId, userId}
3. Backend riceve evento in socket handler
4. Messaggio salvato in MySQL
5. Backend emette di nuovo il messaggio a tutti in canale
   io.to(`channel-${channelId}`).emit(...)
6. Tutti i client nel canale ricevono messaggio
7. Message appare in UI
```

### Componenti Principali

#### Frontend Components

**AnimeSearch.js**:
- Ricerca anime via input
- Chiama Jikan API direttamente (client-side)
- Debouncing con AbortController
- Mostra risultati in lista
- onClick naviga a AnimeDetail

**AnimeDetail.js**:
- Mostra dettagli anime: titolo, descrizione, cover, rating
- Chiama JustWatch API per piattaforme streaming
- Rileva country da geolocation (ipinfo.io)
- Mostra liste community con hashtag anime

**Community.js**:
- Visualizza canali della community
- Mostra messaggi del canale selezionato
- Ascolta socket event per nuovi messaggi
- Permette di scrivere messaggi (emit send-message)

**SocialDashboard.js**:
- Ricerca utenti per username
- Gestisce richieste amicizia (accetta/rifiuta)
- Visualizza lista amici
- Apre chat privata con amico

**Settings.js**:
- Form per modificare profilo (bio, username, immagine)
- Account settings: email, password, 2FA, premium
- App settings: tema, notifiche, accessibilità, audio

#### Backend Models

Ogni model nel `server/models/` espone metodi standard:

```javascript
// Esempio: User model
module.exports = {
  tableName: 'users',
  primaryKey: 'id',
  
  async create(userData) { ... },
  async findById(id) { ... },
  async findByEmail(email) { ... },
  async update(id, updates) { ... },
  async delete(id) { ... },
  async search(query, limit, offset) { ... }
}
```

I model ritornano **Promise** e gestiscono la normalizzazione dati (parsing JSON fields, type casting, ecc.).

---

## Setup Ambiente di Sviluppo

### Prerequisiti

- **Node.js** 18.x+ (verifica con `node -v`)
- **npm** 9.x+ (verifica con `npm -v`)
- **MySQL 5.7+** o **MariaDB 10.5+** in locale
- **Git** (per clonare repo)
- Browser moderno (Chrome, Firefox, Safari)

### Installazione MySQL Locale

**Mac (Homebrew):**
```bash
brew install mysql
brew services start mysql
mysql -u root -p  # password: "" (empty by default)
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql -u root
```

**Windows:**
- Scarica da https://dev.mysql.com/downloads/mysql/
- O usa WSL2 + Linux commands

**Configurazione Iniziale:**
```bash
mysql -u root
> CREATE USER 'root'@'localhost' IDENTIFIED BY 'root';
> GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost';
> FLUSH PRIVILEGES;
```

### Setup Locale del Progetto

#### 1. Clona il Repository

```bash
git clone https://github.com/Tunis-Riccardo/iAnime.git
cd iAnime
```

#### 2. Backend Setup

```bash
cd server
npm install

# Crea file .env (se non esiste)
# Contenuto .env:
# DATABASE_HOST=localhost
# DATABASE_PORT=3306
# DATABASE_USER=root
# DATABASE_PASSWORD=root
# DATABASE_NAME=ianime
# JWT_SECRET=your_secret_key_here_change_in_prod
# NODE_ENV=development

npm start          # Avvia server on :5000
# oppure
npm run dev       # Avvia con nodemon (auto-reload)
```

**Output atteso:**
```
🚀 Inizializzazione database...
✅ Database pronto
✅ MySQL connesso con successo
```

#### 3. Frontend Setup

```bash
cd client
npm install

# Se non hai un .env, il frontend userà /api come proxy
# (da package.json: "proxy": "http://localhost:5000")

npm start          # Avvia su http://localhost:3000
```

**Output atteso:**
```
Compiled successfully!
You can now view ianime-client in the browser.
  Local:            http://localhost:3000
```

#### 4. Verifica Setup

1. Visita http://localhost:3000
2. Prova a registrare un account
3. Verifica che MySQL contenga dati nella tabella users:

```bash
mysql -u root -p ianime
mysql> SELECT COUNT(*) FROM users;
```

---

## Modello Dati

### Entity-Relationship Diagram

```
USERS
├── id (PK)
├── email (UNIQUE)
├── password (hashed)
├── username (UNIQUE)
├── profileImage, bio
├── twoFAEnabled, twoFAMethod, twoFASecret
├── isPremium, premiumExpiresAt
├── friendsList (JSON array of user IDs)
├── blockedUsers (JSON array of user IDs)
├── communities (JSON array of community IDs)
└── settings (theme, language, accessibility, audio)

COMMUNITIES
├── id (PK)
├── name, description
├── adminId (FK → users.id)
├── roles (JSON array)
├── channelGroups (JSON array)
├── members (JSON array of user IDs)
├── categories (JSON array of hashtags)
└── pinnedMessages (JSON array)

CHANNELS
├── id (PK)
├── name
├── type (ENUM: 'text' | 'voice')
├── hashtags (JSON array)
├── maxMembers (default 10)
├── permissions (JSON)
├── messages (JSON array di message IDs)
└── members (JSON array of user IDs)

CHANNEL_GROUPS
├── id (PK)
├── name
└── channels (JSON array of channel IDs)

ROLES
├── id (PK)
├── name
├── permissions (JSON: {kick: true, mute: true, ...})
├── color (hex string)
└── members (JSON array of user IDs)

MESSAGES
├── id (PK)
├── content
├── authorId (FK → users.id)
├── channelId (FK → channels.id)
├── mentions (JSON array)
├── reactions (JSON: {emoji: [user IDs]})
└── createdAt, updatedAt

DIRECT_MESSAGES
├── id (PK)
├── participants (JSON: [userId1, userId2])
├── messages (JSON array of message objects)
└── createdAt, updatedAt

FRIENDSHIPS
├── id (PK)
├── senderId (FK → users.id)
├── recipientId (FK → users.id)
├── status (ENUM: 'pending' | 'accepted' | 'blocked')
└── createdAt, updatedAt

ANIMES
├── id (PK)
├── title (UNIQUE)
├── description, coverImage, rating
├── category, status (ENUM: 'ongoing'|'completed'|'upcoming')
├── jikanId, anilistId, kitsuId (external IDs)
├── platforms (JSON: streaming providers)
├── hashtags (JSON array)
└── followedByCount
```

### Regole di Normalizzazione

- **JSON Fields**: Usati per array/liste (friendsList, communities, roles, permissions)
- **Motivo**: Flessibilità senza denormalizzare troppo
- **Trade-off**: Performance vs flexibility (MySQL JSON è indexed)
- **Nota**: Non ideal per query complex, ma bene per il scope di iAnime

### Soft Deletes

Tutte le tabelle hanno campo `deletedAt`:

```sql
WHERE deletedAt IS NULL  -- Only active records
```

Permette di "eliminare" dati senza perderli (GDPR compliance parziale).

---

## API REST

### Struttura Endpoint

Base URL: `http://localhost:5000/api`

Versioning: `/api/v1/` per stabilità

### Autenticazione

Tutti gli endpoint protetti richiedono header:

```
Authorization: Bearer <JWT_TOKEN>
```

JWT contiene:
```json
{
  "id": 123,
  "email": "user@example.com",
  "username": "myuser",
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Generazione JWT:**

```javascript
const signUserToken = (user, expiresIn = '1h') => {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};
```

### Endpoint Principali

#### Authentication

| Metodo | Endpoint | Autenticazione | Scopo |
|--------|----------|---|---|
| POST | `/v1/auth/register` | No | Crea utente e ritorna JWT |
| POST | `/v1/auth/login` | No | Autentica utente |
| GET | `/v1/auth/me` | **Sì** | Info utente loggato |
| PUT | `/v1/auth/profile` | **Sì** | Aggiorna profilo |
| POST | `/v1/auth/change-password` | **Sì** | Cambia password |
| POST | `/v1/auth/logout` | **Sì** | Logout (opzionale) |

**POST /v1/auth/register:**

```json
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "myuser",
  "publicKey": null  // optional for encryption
}

// Response 201
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "myuser"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**POST /v1/auth/login:**

```json
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "twoFACode": "123456",      // if 2FA enabled
  "challengeId": "uuid-...",  // if 2FA enabled
}

// Response 200
{
  "user": { ... },
  "token": "eyJ..."
}

// If 2FA needed - Response 401
{
  "requiresTwoFA": true,
  "challengeId": "uuid-...",
  "method": "email",
  "destination": "u***@example.com"
}
```

#### Communities

| Metodo | Endpoint | Scopo |
|--------|----------|-------|
| GET | `/v1/communities` | Lista community utente |
| GET | `/v1/communities/:id` | Dettagli community |
| POST | `/v1/communities` | Crea community |
| PUT | `/v1/communities/:id` | Aggiorna community (admin) |
| DELETE | `/v1/communities/:id` | Cancella community (admin) |
| POST | `/v1/communities/:id/join` | Unisciti a community |
| POST | `/v1/communities/:id/leave` | Lascia community |

**POST /v1/communities:**

```json
// Request
{
  "name": "Naruto Italia",
  "description": "Community italiana dedicata a Naruto",
  "categories": ["naruto", "anime"]
}

// Response 201
{
  "id": 1,
  "name": "Naruto Italia",
  "description": "...",
  "adminId": 123,
  "members": [123],
  "roles": [],
  "channelGroups": [],
  "createdAt": "2026-05-14T10:00:00Z"
}
```

#### Channels

| Metodo | Endpoint | Scopo |
|--------|----------|-------|
| GET | `/v1/communities/:communityId/channels` | Lista canali |
| POST | `/v1/communities/:communityId/channels` | Crea canale (admin) |
| GET | `/v1/channels/:id` | Dettagli canale |
| PUT | `/v1/channels/:id` | Aggiorna canale (admin) |
| DELETE | `/v1/channels/:id` | Cancella canale (admin) |
| GET | `/v1/channels/:id/messages` | Lista messaggi |
| POST | `/v1/channels/:id/messages` | Invia messaggio |

#### Messages

| Metodo | Endpoint | Scopo |
|--------|----------|-------|
| PUT | `/v1/messages/:id` | Modifica messaggio |
| DELETE | `/v1/messages/:id` | Cancella messaggio |

#### Social & Users

| Metodo | Endpoint | Scopo |
|--------|----------|-------|
| GET | `/v1/users/search?q=username` | Ricerca utenti |
| GET | `/v1/users/:id` | Profilo utente |
| GET | `/v1/friendships` | Lista amici |
| GET | `/v1/friendships/requests` | Richieste in sospeso |
| POST | `/v1/friendships` | Invia richiesta amicizia |
| POST | `/v1/friendships/:id/accept` | Accetta richiesta |
| POST | `/v1/friendships/:id/reject` | Rifiuta richiesta |
| POST | `/v1/users/:id/block` | Blocca utente |
| DELETE | `/v1/users/:id/block` | Sblocca utente |
| GET | `/v1/users/blocked/list` | Lista bloccati |

#### Utility

| Metodo | Endpoint | Scopo |
|--------|----------|-------|
| GET | `/health` | Health check server |
| GET | `/justwatch?title=X&country=IT` | Piattaforme streaming |

---

## Real-time Communication

### Socket.io Events

Socket.io gestisce comunicazione real-time bidirezionale.

#### Client → Server Events

**user-join**
```javascript
socket.emit('user-join', { userId: 123 });
```
Server registra utente online, emette 'user-online' a tutti.

**send-message**
```javascript
socket.emit('send-message', {
  content: "Ciao!",
  channelId: 5,
  userId: 123
});
```
Message salvato in DB, emesso a tutti in canale.

**send-dm**
```javascript
socket.emit('send-dm', {
  content: "Privato",
  recipientId: 456,
  senderId: 123
});
```
DM salvato, emesso a recipient se online.

**user-typing**
```javascript
socket.emit('user-typing', {
  channelId: 5,
  userId: 123,
  isTyping: true
});
```
Broadcast a canale che utente sta scrivendo.

**join-channel**
```javascript
socket.emit('join-channel', { channelId: 5 });
```
Utente si unisce a room `channel-5`.

#### Server → Client Events

**user-online**
```javascript
socket.on('user-online', (data) => {
  // { userId, socketId, onlineUsers: [...] }
});
```

**channel-{channelId}**
```javascript
socket.on('channel-5', (data) => {
  // { type: 'message', message: {...} }
});
```

**receive-dm**
```javascript
socket.on('receive-dm', (data) => {
  // { dmSessionId, message: {...} }
});
```

**typing-{channelId}**
```javascript
socket.on('typing-5', (data) => {
  // { userId, isTyping }
});
```

### Implementazione Socket.io nel Backend

```javascript
const io = socketIo(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling']
});

io.on('connection', (socket) => {
  console.log(`Utente connesso: ${socket.id}`);

  socket.on('user-join', async (data) => {
    const { userId } = data;
    connectedUsers.set(socket.id, { userId, socketId: socket.id });
    io.emit('user-online', { userId, socketId: socket.id });
  });

  socket.on('send-message', async (data) => {
    const { content, channelId, userId } = data;
    const message = await Message.create({...});
    io.to(`channel-${channelId}`).emit(`channel-${channelId}`, {
      type: 'message',
      message
    });
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
  });
});
```

---

## Autenticazione e Autorizzazione

### JWT Authentication

**Flow:**
1. User login valido → JWT generato
2. Token salvato in localStorage client
3. Token inviato in header Authorization
4. Backend valida signature e expiration
5. Se valido, request autorizzato

**Middleware Express:**

```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalido' });
    }
    req.user = decoded;
    next();
  });
};

// Uso:
app.get('/api/v1/auth/me', authenticateToken, (req, res) => {
  // req.user contiene decoded JWT
  res.json({ user: req.user });
});
```

### Two-Factor Authentication (2FA)

Metodi supportati:

1. **SMS**: Codice numerico inviato via SMS
2. **Email**: Codice numerico inviato via email
3. **App Authenticator**: TOTP con Google Authenticator

**Setup 2FA con App Authenticator:**

```javascript
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// 1. Generate secret
const secret = speakeasy.generateSecret({
  name: `iAnime (${user.email})`,
  issuer: 'iAnime'
});
// secret.base32: "JBSWY3DPEBLW64TMMQ======"

// 2. Generate QR code
const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);
// User scans QR code in authenticator app

// 3. Verify code from app
const isValid = speakeasy.totp.verify({
  secret: secret.base32,
  encoding: 'base32',
  token: userInput,  // e.g., "123456"
  window: 1
});
```

**Challenge System (per SMS/Email):**

```javascript
const createChallenge = ({ userId, purpose, method, destination }) => {
  const challengeId = crypto.randomUUID();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000;

  twoFAChallenges.set(challengeId, {
    userId, purpose, method, destination, code, expiresAt
  });

  return { challengeId, code, expiresAt };
};

// Invia email/SMS con code, ritorna challengeId
// User inserisce code + challengeId
// Verify: twoFAChallenges.get(challengeId).code === userCode
```

### Authorization Rules

**Community Admin:**
- Può modificare/eliminare community
- Può bannare/mutare membri
- Può creare/eliminare canali
- Può gestire ruoli e permessi

**Community Member con Ruolo:**
- Permessi in base ai role permissions
- Es: ruolo "Moderator" può mutare altri

**User:**
- Può modificare solo il proprio profilo
- Può creare DM solo con amici (se non accetta stranieri)
- Può bloccare/sbloccare utenti

---

## Integrazione API Esterne

### Jikan API (Anime Search)

**Scopo**: Database anime con dettagli completi

**Endpoint**: `https://api.jikan.moe/rest/v4`

**Uso nel Frontend:**

```javascript
// AnimeSearch.js
const searchAnime = async (query) => {
  const response = await fetch(
    `https://api.jikan.moe/rest/v4/anime?query=${query}`
  );
  const data = await response.json();
  return data.data; // array di anime
};
```

**Limitazioni**:
- Rate limit: ~60 req/min
- Cachare i risultati per performance

### JustWatch API (Streaming Platforms)

**Scopo**: Dove guardare anime in base a paese

**Endpoint**: `https://apis.justwatch.com/content/titles/{country}/popular`

**Uso nel Backend:**

```javascript
app.get('/api/justwatch', async (req, res) => {
  const { title, country } = req.query;
  const url = `https://apis.justwatch.com/content/titles/${country || 'US'}/popular?query=${title}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  const platforms = data.items[0].offers.map(offer => ({
    name: offer.provider_id,
    url: offer.urls?.standard_web,
    type: offer.monetization_type
  }));
  
  res.json({ platforms, country });
});
```

**Cache**: Implementato con Map in memoria (1 hour TTL)

### ipinfo.io (Geolocation)

**Scopo**: Rilevare paese utente per JustWatch

**Uso**: Client-side script (non in codice attuale)

```javascript
// Rilevare IP utente (opzionale)
const response = await fetch('https://ipinfo.io?token=YOUR_TOKEN');
const data = await response.json();
const country = data.country; // "IT", "US", ecc.
```

---

## Build e Deployment

### Development

**Backend:**
```bash
cd server
npm install
npm run dev        # nodemon + auto-reload
```

**Frontend:**
```bash
cd client
npm install
npm start          # CRA dev server
```

### Production Build

**Backend:**
```bash
cd server
npm install --production
npm start
```

**Frontend:**
```bash
cd client
npm install
npm run build      # Crea /client/build/ minificato
```

Servire il build:
```bash
npm install -g serve
serve -s build -l 3000
```

### Docker (Suggerito)

**Dockerfile backend:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install --production
COPY server/ ./
EXPOSE 5000
CMD ["npm", "start"]
```

**Dockerfile frontend:**
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Deployment Checklist

- [ ] Set environment variables (.env)
- [ ] Database backup strategy
- [ ] HTTPS/SSL certificate
- [ ] CORS configuration (origin whitelist)
- [ ] Database credentials non pubbliche
- [ ] JWT_SECRET sicuro (random 32+ chars)
- [ ] Rate limiting su endpoints
- [ ] Logging e monitoring
- [ ] CDN per static assets
- [ ] Load balancer se multi-instance

---

## Testing

### Frontend Testing

**Unit Tests** (Jest + React Testing Library):

```bash
cd client
npm test
```

Esempio test:
```javascript
import { render, screen } from '@testing-library/react';
import Login from './components/Login';

test('mostra form login', () => {
  render(<Login />);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});
```

### Backend Testing

**API Testing** (Postman / curl):

```bash
# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Pass123!","username":"testuser"}'

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Pass123!"}'

# Get user (con token)
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer JWT_TOKEN"
```

### End-to-End Testing (Cypress)

```bash
cd client
npm install cypress --save-dev
npx cypress open
```

---

## Performance

### Ottimizzazioni Frontend

1. **Code Splitting**: React.lazy() per import dinamico
2. **Memoization**: React.memo() per componenti costosi
3. **Debouncing**: Ricerca anime con delay
4. **Caching**: SessionStorage/LocalStorage per dati

### Ottimizzazioni Backend

1. **Connection Pooling**: mysql2 connection pool (limit: 10)
2. **Query Optimization**: SELECT campi necessari, WHERE indexes
3. **JSON Field Indexing**: MySQL supporta GENERATED INDEX su JSON fields
4. **Caching**: In-memory cache per JustWatch (1 hour TTL)
5. **Pagination**: GET endpoints con limit/offset

Esempio query ottimizzata:
```sql
-- ✅ GOOD
SELECT id, username, email FROM users 
WHERE id = ? AND deletedAt IS NULL;

-- ❌ BAD
SELECT * FROM users;  -- Carica tutto
```

### Database Indexes

```sql
-- PK (auto-indexed)
ALTER TABLE users ADD PRIMARY KEY (id);

-- UNIQUE constraints
ALTER TABLE users ADD UNIQUE KEY (email);
ALTER TABLE users ADD UNIQUE KEY (username);

-- Foreign Keys
ALTER TABLE communities ADD INDEX idx_adminId (adminId);

-- JSON fields
ALTER TABLE users ADD INDEX idx_communities 
  ((JSON_EXTRACT(communities, '$[*]')));
```

---

## Sicurezza

### Best Practices Implementate

1. **Password Hashing**: bcryptjs con salt rounds: 10
2. **JWT Signing**: HS256 con secret sicuro
3. **CORS**: Configurato con whitelist origin
4. **SQL Injection**: Prepared statements (mysql2)
5. **XSS Protection**: React escapa automaticamente
6. **HTTPS**: Consigliato in produzione
7. **Rate Limiting**: Implementare express-rate-limit in produzione
8. **CSRF**: SameSite cookies

### Password Policy

```javascript
const isStrongPassword = (password) => {
  // Min 8 chars, maiuscola, minuscola, numero
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
};
```

### CORS Configuration

```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));
```

### Environment Variables

**.env File (NEVER commit):**
```
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=root
DATABASE_NAME=ianime
JWT_SECRET=your_super_secret_key_change_in_production_NOW
REACT_APP_API_URL=http://localhost:5000/api
ALLOWED_ORIGINS=http://localhost:3000,https://ianime.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 2FA Best Practices

- Challenge expires in 5 minuti
- Codice 6 cifre (1M combinazioni)
- Rate limit 3 tentativi per challenge
- Log tentativi falliti

---

## Troubleshooting Sviluppatori

### MySQL Connection Error

**Error**: "Error: connect ECONNREFUSED 127.0.0.1:3306"

**Soluzione**:
```bash
# Verifica MySQL sia attivo
sudo systemctl status mysql        # Linux
brew services list | grep mysql   # Mac

# Verifica credenziali .env
mysql -u root -p -h localhost -P 3306

# Reimposta password root
sudo mysql
> ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';
> FLUSH PRIVILEGES;
```

### JWT Token Invalid

**Error**: "Token invalido" o "Forbidden"

**Soluzione**:
```javascript
// Verifica JWT_SECRET
console.log(process.env.JWT_SECRET); // non vuoto

// Testa token decoding
const jwt = require('jsonwebtoken');
const decoded = jwt.decode(token); // vedi payload
console.log(decoded);

// Rigenera token
const newToken = jwt.sign({...}, process.env.JWT_SECRET, { expiresIn: '1h' });
```

### Socket.io Not Connecting

**Error**: WebSocket connection failed, polling fallback

**Soluzione**:
```javascript
// Frontend verificare:
console.log(socket.connected);  // true/false

// Backend verificare CORS:
const io = socketIo(server, {
  cors: { origin: '*' },  // TEMPORANEO per debug
  transports: ['websocket', 'polling']
});

// Controlla firewall non blocchi :5000
lsof -i :5000  # che processi usano porta 5000
```

### Database Seed Non Viene Eseguito

**Error**: Database vuoto al primo avvio

**Soluzione**:
```javascript
// server/index.js verificare che initializeDatabase sia chiamato
const { initializeDatabase } = require('./db/seed');
await initializeDatabase();

// Forzare reset database
const { resetDatabase } = require('./db/connection');
await resetDatabase();
```

### React Component Not Updating

**Error**: Componente non si aggiorna con nuovi messaggi

**Soluzione**:
```javascript
// Verificare useState hook
const [messages, setMessages] = useState([]);

// Socket listener deve aggiornare state
socket.on('channel-5', (data) => {
  setMessages(prev => [...prev, data.message]);  // copia array
});

// Verificare useEffect dependencies
useEffect(() => {
  // setup socket listener
  return () => socket.off('channel-5'); // cleanup
}, []);
```

---

## Roadmap Future

### Short Term

- [ ] Implementare rate limiting API
- [ ] Aggiungere logging strutturato (Winston/Bunyan)
- [ ] Test suite completo (Jest + Supertest)
- [ ] API documentation auto-generata (Swagger/OpenAPI)

### Medium Term

- [ ] App mobile nativa (React Native)
- [ ] Merchandise integration (Shopify API)
- [ ] Advanced statistics dashboard
- [ ] Video chat in community (WebRTC)

### Long Term

- [ ] Machine learning recommendations
- [ ] Blockchain integration (NFT profiles)
- [ ] Internationalization (i18n) complete
- [ ] Microservices architecture

---

## Riferimenti

- **React Docs**: https://react.dev
- **Express Docs**: https://expressjs.com
- **Socket.io Docs**: https://socket.io
- **MySQL Docs**: https://dev.mysql.com
- **JWT Auth**: https://tools.ietf.org/html/rfc7519
- **Jikan API**: https://jikan.moe
- **JustWatch API**: https://www.justwatch.com/

---

**Ultima modifica**: Maggio 2026
**Versione**: 1.0
**Autore**: Development Team
