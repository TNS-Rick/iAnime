# iAnime - Documentazione per Sviluppatori

## Indice
1. [Architettura del Sistema](#architettura-del-sistema)
2. [Tecnologie Utilizzate](#tecnologie-utilizzate)
3. [Struttura del Codice](#struttura-del-codice)
4. [Setup Ambiente di Sviluppo](#setup-ambiente-di-sviluppo)
5. [API e Integrazioni](#api-e-integrazioni)
6. [Modello Dati](#modello-dati)
7. [Best Practice e Convenzioni](#best-practice-e-convenzioni)
8. [Guida al Debugging](#guida-al-debugging)
9. [Deployment](#deployment)

---

## Architettura del Sistema

### Overview Architettonico
iAnime segue un'architettura **client-server decoupled** con comunicazione real-time via Socket.io:

```
┌─────────────────────────────────────────────┐
│         Frontend (React 18)                 │
│  - AnimeSearch, AnimeDetail                 │
│  - Community, SocialDashboard               │
│  - Settings, Authentication                 │
└──────────────────┬──────────────────────────┘
                   │ HTTP + WebSocket
                   ▼
┌─────────────────────────────────────────────┐
│    Backend (Express.js + Socket.io)         │
│  - Authentication & Authorization           │
│  - Community Management                     │
│  - Real-time Chat                           │
│  - User Social Features                     │
└──────────────────┬──────────────────────────┘
                   │ MySQL/MariaDB
                   ▼
┌─────────────────────────────────────────────┐
│    Database (MySQL)                         │
│  - Users, Communities, Messages             │
│  - Friendships, Roles, Channels             │
└─────────────────────────────────────────────┘
```

### Componenti Principali

#### Frontend
- **React Component Layer**: Gestisce UI, stato locale e navigazione
- **Socket.io Client**: Mantiene connessione real-time con backend
- **API Service Layer**: Centralizza chiamate HTTP verso backend
- **Router**: React Router per navigazione SPA

#### Backend
- **Express Server**: Gestisce HTTP requests, middleware
- **Socket.io Server**: Gestisce comunicazione real-time
- **Authentication Middleware**: JWT-based auth
- **Data Access Layer**: Query MySQL tramite mysql2 package

#### Database
- **Persistence Layer**: MySQL con schema relazionale
- **Seeding**: Popola dati iniziali all'avvio

---

## Tecnologie Utilizzate

### Frontend Stack
| Tecnologia | Versione | Utilizzo |
|---|---|---|
| **React** | 18.x | UI Framework |
| **React Router** | 6.x | Client-side routing |
| **Bootstrap** | 5.x | CSS Framework |
| **Socket.io Client** | 4.x | Real-time communication |
| **Axios** | 1.x | HTTP requests |
| **js-cookie** | 3.x | Token storage |

### Backend Stack
| Tecnologia | Versione | Utilizzo |
|---|---|---|
| **Node.js** | 18.x+ | Runtime |
| **Express.js** | 5.x | Web framework |
| **Socket.io** | 4.x | Real-time events |
| **mysql2** | 3.x | MySQL driver |
| **bcryptjs** | 2.x | Password hashing |
| **jsonwebtoken** | 9.x | JWT generation/verification |
| **dotenv** | 16.x | Environment variables |
| **cors** | 2.x | Cross-Origin Resource Sharing |

### API Esterne
- **Jikan API**: Anime data aggregation
- **JustWatch API**: Streaming platform availability
- **ipinfo.io**: Geolocation for platform filtering

---

## Struttura del Codice

```
iAnime/
├── client/                          # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnimeSearch.js       # Search & browse anime
│   │   │   ├── AnimeDetail.js       # Anime details page
│   │   │   ├── Community.js         # Community chat view
│   │   │   ├── CommunityDashboard.js# Community management
│   │   │   ├── SocialDashboard.js   # Friends & messaging
│   │   │   ├── Settings.js          # User preferences
│   │   │   ├── Auth.css             # Auth styling
│   │   │   ├── Login.js             # Login form
│   │   │   ├── Register.js          # Registration form
│   │   │   ├── TwoFactorSetup.js    # 2FA configuration
│   │   │   ├── MerchSuggestions.js  # Merchandise recommendations
│   │   │   └── StreamingPlatforms.js# Platform availability
│   │   ├── services/
│   │   │   └── api.js               # Centralized API calls
│   │   ├── utils/
│   │   │   └── animeTags.js         # Helper functions
│   │   ├── App.js                   # Main router & layout
│   │   └── index.js                 # Entry point
│   └── package.json
│
├── server/                          # Backend Express
│   ├── api/
│   │   ├── auth.js                  # Auth logic & JWT
│   │   ├── authEndpoints.js         # Auth HTTP routes
│   │   ├── communityEndpoints.js    # Community HTTP routes
│   │   ├── communityEndpointsV2.js  # Community v2 routes
│   │   ├── dataApi.js               # Runtime API docs (unused)
│   │   ├── resources.js             # HTTP helper functions
│   │   └── testEndpoints.js         # Test/debug routes
│   ├── db/
│   │   ├── connection.js            # MySQL connection pool
│   │   ├── schema.js                # Table definitions
│   │   └── seed.js                  # Initial data population
│   ├── models/
│   │   ├── User.js                  # User data operations
│   │   ├── Anime.js                 # Anime data operations
│   │   ├── Community.js             # Community data operations
│   │   ├── Channel.js               # Channel data operations
│   │   ├── ChannelGroup.js          # Channel group operations
│   │   ├── Message.js               # Message data operations
│   │   ├── DirectMessage.js         # DM data operations
│   │   ├── Role.js                  # Role data operations
│   │   ├── Friendship.js            # Friendship data operations
│   │   └── index.js                 # Models export
│   ├── index.js                     # Main server entry point
│   ├── package.json                 # Dependencies
│   └── README.md                    # Server documentation
│
├── docs/                            # Documentation
│   ├── ARCHITETTURA.md              # Technical architecture
│   ├── DEVELOPER_DOCUMENTATION.md   # This file
│   └── USER_GUIDE.md                # User guide
│
└── README.md                        # Project overview
```

### Flusso del Codice

#### Request HTTP Lifecycle
1. **Frontend**: `api.js` prepara richiesta con token JWT
2. **Network**: HTTP request verso `http://localhost:5000/api/...`
3. **Backend**: Middleware CORS verifica origin
4. **Auth Middleware**: JWT token è validato da `auth.js`
5. **Route Handler**: Endpoint specifico (es: `authEndpoints.js`)
6. **Data Layer**: Chiama metodi da `models/*.js`
7. **Database**: Query MySQL eseguita via `mysql2`
8. **Response**: JSON ritorna al client

#### Real-time Socket.io Lifecycle
1. **Frontend**: Socket client emette evento (es: `send-message`)
2. **Backend**: Socket server riceve in `index.js`
3. **Handler**: Elabora logica (ex: salva messaggio, valida permessi)
4. **Broadcast**: Emette evento a room/destinatario specifico
5. **Frontend**: Client Socket riceve e aggiorna UI

---

## Setup Ambiente di Sviluppo

### Prerequisiti
- Node.js 18.x+ 
- MySQL 5.7+ o MariaDB 10.3+
- Git

### Installazione Locale

#### 1. Clonare il Repository
```bash
git clone https://github.com/TNS-Rick/iAnime.git
cd iAnime
```

#### 2. Configurare Backend

```bash
cd server
npm install
```

Creare file `.env` in `server/` (vedi [Variabili di Ambiente](#variabili-di-ambiente)):
```env
DATABASE_URL=mysql://root:password@localhost:3306/ianime
JWT_SECRET=your-super-secret-key-change-in-production
IPINFO_TOKEN=your-ipinfo-token
JUSTWATCH_API_KEY=your-justwatch-key
NODE_ENV=development
PORT=5000
```

#### 3. Inizializzare Database
```bash
# Avviare MySQL/MariaDB
mysql -u root -p

# Nel client MySQL:
CREATE DATABASE ianime;
USE ianime;
```

#### 4. Avviare Backend
```bash
npm start
# Server avviato su http://localhost:5000
```

#### 5. Configurare Frontend

```bash
cd ../client
npm install
```

Verificare proxy in `package.json`:
```json
{
  "proxy": "http://localhost:5000"
}
```

#### 6. Avviare Frontend
```bash
npm start
# Client avviato su http://localhost:3000
```

### Variabili di Ambiente

#### Server (.env)
```env
# Database
DATABASE_URL=mysql://user:pass@localhost:3306/ianime

# JWT
JWT_SECRET=change-this-in-production

# External APIs
IPINFO_TOKEN=token-from-ipinfo.io
JUSTWATCH_API_KEY=key-from-justwatch

# Environment
NODE_ENV=development
PORT=5000

# Email (Optional - per password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@ianime.com
SMTP_PASS=app-password

# Premium Payments (Optional)
STRIPE_SECRET_KEY=sk_test_xxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
```

#### Client (Environment Variables)
Frontend legge da `process.env.REACT_APP_*`:
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## API e Integrazioni

### REST API Endpoints

#### Authentication Routes
```
POST   /api/v1/auth/register          # Registrazione utente
POST   /api/v1/auth/login             # Login utente
POST   /api/v1/auth/logout            # Logout utente
GET    /api/v1/auth/me                # Get profilo corrente
PUT    /api/v1/auth/profile           # Aggiorna profilo
POST   /api/v1/auth/change-password   # Cambia password
POST   /api/v1/auth/2fa-send          # Invia codice 2FA
POST   /api/v1/auth/2fa-verify        # Verifica codice 2FA
POST   /api/v1/auth/password-reset    # Richiedi reset password
POST   /api/v1/auth/password-confirm  # Conferma reset password
```

#### Community Routes
```
GET    /api/v1/communities            # List utente communities
POST   /api/v1/communities            # Crea community
GET    /api/v1/communities/:id        # Dettagli community
PUT    /api/v1/communities/:id        # Aggiorna community
DELETE /api/v1/communities/:id        # Elimina community
POST   /api/v1/communities/:id/join   # Entra in community
POST   /api/v1/communities/:id/leave  # Esci da community
```

#### Channel Routes
```
GET    /api/v1/communities/:communityId/channels
POST   /api/v1/communities/:communityId/channels
GET    /api/v1/channels/:id           # Dettagli canale
PUT    /api/v1/channels/:id           # Aggiorna canale
DELETE /api/v1/channels/:id           # Elimina canale
```

#### Message Routes
```
GET    /api/v1/channels/:id/messages  # Lista messaggi
POST   /api/v1/channels/:id/messages  # Invia messaggio
PUT    /api/v1/messages/:id           # Modifica messaggio
DELETE /api/v1/messages/:id           # Elimina messaggio
POST   /api/v1/messages/:id/react     # Aggiungi reazione
```

#### Social Routes
```
GET    /api/v1/users/search           # Cerca utenti per username
GET    /api/v1/users/:id              # Profilo pubblico utente
GET    /api/v1/friendships            # Lista amici
GET    /api/v1/friendships/requests   # Richieste amicizia pending
POST   /api/v1/friendships            # Invia richiesta amicizia
POST   /api/v1/friendships/:id/accept # Accetta richiesta
POST   /api/v1/friendships/:id/reject # Rifiuta richiesta
GET    /api/v1/users/blocked/list     # Lista utenti bloccati
POST   /api/v1/users/:id/block        # Blocca utente
DELETE /api/v1/users/:id/block        # Sblocca utente
```

#### Extra Routes
```
GET    /api/health                    # Health check
GET    /api/justwatch?title=X&country=US  # Piattaforme streaming
```

### Request/Response Format

#### Esempio Request Autenticato
```javascript
// Header con JWT token
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  "Content-Type": "application/json"
}
```

#### Esempio Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "username": "anime-fan",
    "email": "fan@example.com"
  }
}
```

#### Esempio Error Response (400/500)
```json
{
  "success": false,
  "error": "Invalid credentials",
  "code": "AUTH_FAILED"
}
```

### Socket.io Events

#### Client → Server
```javascript
// User Management
socket.emit('user-join', { userId })
socket.emit('user-offline', { userId })

// Chat
socket.emit('join-channel', { channelId })
socket.emit('leave-channel', { channelId })
socket.emit('send-message', { 
  channelId, 
  content, 
  authorId 
})
socket.emit('send-dm', { 
  recipientId, 
  content 
})

// Presence
socket.emit('user-typing', { 
  channelId, 
  userId 
})
```

#### Server → Client
```javascript
// User Presence
socket.on('user-online', (data))
socket.on('user-offline', (data))

// Messages
socket.on('channel-<channelId>', (message))
socket.on('receive-dm', (message))
socket.on('dm-sent', (confirmation))

// Typing Indicators
socket.on('typing-<channelId>', (data))
```

### Integrazioni API Esterne

#### Jikan API (Anime Data)
```javascript
// Ricerca anime
GET https://api.jikan.moe/v4/anime?query=naruto

// Dettagli anime
GET https://api.jikan.moe/v4/anime/{id}

// Response cache: 1 ora
```

#### JustWatch API (Streaming Platforms)
```javascript
// Backend endpoint wrapper
GET /api/justwatch?title=Naruto&country=US

// Response: array di piattaforme con URL
[
  { name: "Crunchyroll", url: "...", type: "subscription" },
  { name: "Netflix", url: "...", type: "subscription" }
]
```

#### ipinfo.io (Geolocation)
```javascript
// Determinare paese utente per filtering
GET https://ipinfo.io/json?token=TOKEN

// Response: { country: "IT", ... }
// Cache: 1 ora per IP
```

---

## Modello Dati

### Schema Database

#### users
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_image VARCHAR(500),
  bio TEXT,
  display_name_color VARCHAR(7),
  profile_frame_style VARCHAR(50),
  theme VARCHAR(50) DEFAULT 'light',
  display_mode ENUM('light', 'dark') DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'it',
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at DATETIME,
  billing_method VARCHAR(50),
  two_fa_enabled BOOLEAN DEFAULT FALSE,
  two_fa_method ENUM('phone', 'email', 'app'),
  who_can_invite ENUM('all', 'friends', 'none') DEFAULT 'all',
  accept_stranger_messages BOOLEAN DEFAULT TRUE,
  colorblind_mode ENUM('normal', 'deuteranopia', 'protanopia', 'tritanopia'),
  high_contrast BOOLEAN DEFAULT FALSE,
  text_size DECIMAL(3,2) DEFAULT 1.0,
  input_device VARCHAR(100),
  output_device VARCHAR(100),
  volume INT DEFAULT 100,
  friends JSON,
  blocked_users JSON,
  communities JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP
);
```

#### communities
```sql
CREATE TABLE communities (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  admin_id VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  roles JSON,
  categories JSON,
  channel_groups JSON,
  members JSON,
  pinned_messages JSON,
  FOREIGN KEY (admin_id) REFERENCES users(id)
);
```

#### channels
```sql
CREATE TABLE channels (
  id VARCHAR(36) PRIMARY KEY,
  community_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('text', 'voice') DEFAULT 'text',
  max_members INT DEFAULT 10,
  hashtags JSON,
  permissions JSON,
  members JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (community_id) REFERENCES communities(id)
);
```

#### messages
```sql
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  author_id VARCHAR(36) NOT NULL,
  channel_id VARCHAR(36),
  dm_session_id VARCHAR(36),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  reactions JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (channel_id) REFERENCES channels(id)
);
```

#### friendships
```sql
CREATE TABLE friendships (
  id VARCHAR(36) PRIMARY KEY,
  requester_id VARCHAR(36) NOT NULL,
  recipient_id VARCHAR(36) NOT NULL,
  status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  UNIQUE KEY unique_friendship (requester_id, recipient_id)
);
```

#### direct_messages (chat private)
```sql
CREATE TABLE direct_messages (
  id VARCHAR(36) PRIMARY KEY,
  participant_1_id VARCHAR(36) NOT NULL,
  participant_2_id VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  messages JSON,
  FOREIGN KEY (participant_1_id) REFERENCES users(id),
  FOREIGN KEY (participant_2_id) REFERENCES users(id)
);
```

### Relazioni Entity-Relationship

```
User
  ├─ 1:N → Community (admin)
  ├─ 1:N → Message (author)
  ├─ 1:N → Friendship (requester/recipient)
  └─ M:N → Community (members)

Community
  ├─ N:1 → User (admin)
  ├─ 1:N → Channel
  ├─ 1:N → ChannelGroup
  ├─ 1:N → Role
  └─ M:N → User (members)

Channel
  ├─ N:1 → Community
  └─ 1:N → Message

Message
  ├─ N:1 → User (author)
  ├─ N:1 → Channel (channel)
  └─ Optional: N:1 → DirectMessage

Friendship
  ├─ N:1 → User (requester)
  └─ N:1 → User (recipient)
```

---

## Best Practice e Convenzioni

### Naming Conventions

#### Variables & Functions
```javascript
// camelCase per variabili e funzioni
const userData = {};
function fetchUserData() {}

// CONSTANT_CASE per costanti
const API_BASE_URL = 'http://localhost:5000';
const MAX_MESSAGE_LENGTH = 2000;

// PascalCase per classi e componenti React
class UserManager {}
function AnimeSearch() {} // React component
```

#### Database
```sql
-- snake_case per nomi tabelle e colonne
CREATE TABLE channel_groups (
  id VARCHAR(36),
  community_id VARCHAR(36),
  created_at DATETIME
);
```

#### Files
```
-- Componenti React: PascalCase.js
AnimeSearch.js
CommunityDashboard.js

-- Moduli/utilità: camelCase.js
apiService.js
authHelpers.js

-- Configurazione: lowercase.json o .env
package.json
.env
```

### Struttura di un Componente React

```javascript
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export function ComponentName() {
  // State management
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Routing
  const { id } = useParams();
  const navigate = useNavigate();

  // Effects
  useEffect(() => {
    fetchData();
  }, [id]);

  // Async operations
  async function fetchData() {
    try {
      setLoading(true);
      const response = await api.get(`/endpoint/${id}`);
      setData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handlers
  function handleAction() {}

  // Render
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {/* JSX content */}
    </div>
  );
}
```

### Error Handling

#### Frontend
```javascript
try {
  const response = await api.post('/api/endpoint', data);
  return response.data;
} catch (error) {
  if (error.response?.status === 401) {
    // Unauthorized - redirect to login
    navigate('/login');
  } else if (error.response?.status === 422) {
    // Validation error
    console.error('Validation:', error.response.data.errors);
  } else {
    // Generic error
    setError(error.message);
  }
}
```

#### Backend
```javascript
// Express error middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message,
    code: err.code || 'INTERNAL_ERROR'
  });
});
```

### Authentication Flow

1. **Registration**: POST `/api/v1/auth/register` con email, password, username
2. **Login**: POST `/api/v1/auth/login` ritorna JWT token
3. **Token Storage**: Salvare in localStorage via `js-cookie`
4. **Authenticated Requests**: Header Authorization con token
5. **Token Validation**: Middleware express valida firma JWT
6. **Refresh**: Se token scade, richiedere nuovo login

```javascript
// Frontend - Salvare token
const token = response.data.token;
Cookie.set('auth_token', token, { expires: 7 });

// Frontend - Inviare con richieste
const config = {
  headers: { Authorization: `Bearer ${Cookie.get('auth_token')}` }
};
axios.get('/api/protected', config);

// Backend - Validare
const token = req.headers.authorization?.split(' ')[1];
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
} catch {
  res.status(401).json({ error: 'Unauthorized' });
}
```

### Security Best Practice

1. **Password Hashing**: Utilizzare bcryptjs con salt >= 10
```javascript
const hash = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hash);
```

2. **JWT Tokens**: Firmare con secret forte
```javascript
const token = jwt.sign(
  { id: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

3. **CORS**: Limitare origin conosciute
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'https://ianime.app'],
  credentials: true
}));
```

4. **Input Validation**: Validare tutti gli input
```javascript
// Usare librerie come joi o express-validator
const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});
const { error, value } = schema.validate(req.body);
```

5. **Rate Limiting**: Proteggere endpoint sensibili
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100 // limita 100 richieste per finestra
});
app.use('/api/auth/', limiter);
```

---

## Guida al Debugging

### Logger Setup
```javascript
// Backend - console.log strutturato
console.log('[INFO]', new Date().toISOString(), message);
console.error('[ERROR]', error.stack);

// Opzionale: Winston logger
const logger = require('winston');
logger.info('User logged in', { userId: user.id });
```

### Common Issues

#### Problema: CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Soluzione**:
- Verificare `cors()` middleware in server
- Controllare `package.json` proxy in client
- Verificare URL API in `services/api.js`

#### Problema: 401 Unauthorized
```json
{ "error": "Unauthorized" }
```
**Soluzione**:
- Verificare token è presente in localStorage
- Controllare JWT_SECRET matching frontend/backend
- Testare token con jwt.io decoder

#### Problema: Socket.io Connection Failed
**Soluzione**:
- Verificare server Socket.io è avviato
- Controllare URL socket nel client
- Verificare firewall non blocca WebSocket

#### Problema: Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Soluzione**:
- Verificare MySQL/MariaDB è running
- Controllare DATABASE_URL in .env
- Testare connessione: `mysql -u root -p`

### Debug Tools

#### Network Inspector (Chrome DevTools)
1. Aprire `DevTools > Network`
2. Filtrare per API calls
3. Controllare request headers, response body, status code

#### Database Query Logging
```javascript
// server/db/connection.js
connection.config.trace = true;
connection.on('error', (err) => {
  console.error('[DB Error]', err);
});
```

#### Socket.io Inspector
```javascript
// Client
socket.onAny((event, ...args) => {
  console.log(`[Socket] ${event}:`, args);
});

// Server
io.on('connection', (socket) => {
  socket.onAny((event, ...args) => {
    console.log(`[Socket ${socket.id}] ${event}:`, args);
  });
});
```

---

## Deployment

### Checklist Pre-Deployment

- [ ] Variabili di ambiente aggiornate (JWT_SECRET, DB credenziali)
- [ ] Database migrato e backup effettuato
- [ ] Frontend build generata (`npm run build`)
- [ ] Environment NODE_ENV=production
- [ ] HTTPS abilitato
- [ ] CORS configurato per origin produzione
- [ ] Logging configurato
- [ ] Rate limiting attivato

### Docker Deployment (Optional)

```dockerfile
# Dockerfile backend
FROM node:18-alpine
WORKDIR /app
COPY server package*.json ./
RUN npm install
COPY server . .
EXPOSE 5000
CMD ["npm", "start"]
```

```dockerfile
# Dockerfile frontend
FROM node:18-alpine AS build
WORKDIR /app
COPY client package*.json ./
RUN npm install
COPY client . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Deployment su Vercel / Heroku

#### Vercel (Frontend)
```bash
npm install -g vercel
vercel
```

#### Heroku (Backend)
```bash
heroku login
heroku create ianime-api
git push heroku main
```

---

## Contributors & License

Vedere [README.md](../README.md) per ulteriori dettagli su autori e licenza.
