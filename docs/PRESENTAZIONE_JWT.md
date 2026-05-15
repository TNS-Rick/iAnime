# JWT - JSON Web Token
## Protezione delle API nel progetto iAnime

---

## 📋 Indice

1. [Cos'è un JWT](#1-cosè-un-jwt)
2. [A cosa serve](#2-a-cosa-serve)
3. [Assegnazione agli utenti](#3-come-vengono-assegnati-gli-utenti)
4. [Utilizzo pratico](#4-utilizzo-pratico-nel-progetto)
5. [Diagramma del flusso](#5-diagramma-del-flusso-completo)
6. [Sicurezza](#6-sicurezza-nelimplementazione)
7. [Conclusioni](#7-conclusioni)

---

## 1. Cos'è un JWT?

### Definizione semplice

Un **JWT (JSON Web Token)** è un token testuale **autofirmato e autovalidante** che contiene informazioni cifrate su un utente. 

Viene usato per dimostrare al server: *"Sono io, guarda il mio token, non è stato modificato!"*

### Struttura di un JWT

Un JWT è composto da **tre parti separate da punti** (`.`):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.
eyJzdWIiOiIxMjMiLCJpZCI6IjEyMyIsImVtYWlsIjoic3R1ZGVudGVAZXhhbXBsZS5jb20ifQ
.
vJrDKM8NfKBh_kxnx_e2Ka2n4sNQ5NQRs4Jk5NQbB9I
```

### Le tre parti:

| Parte | Nome | Cosa contiene | Esempio |
|-------|------|---------------|---------|
| **1ª** | **Header** | Metadati (algoritmo, tipo) | `{"alg":"HS256","typ":"JWT"}` |
| **2ª** | **Payload** | Dati dell'utente (claims) | `{"id":"123","email":"user@email.com","username":"john"}` |
| **3ª** | **Signature** | Firma digitale | `vJrDKM8NfKBh_kxnx_e2Ka2n4sNQ5NQ...` |

### ⚠️ Importante: Non è criptato!

```
❌ Il JWT non nasconde i dati
✅ Ma impedisce la manomissione (firma digitale)
```

**Chiunque può leggere** il payload decodificandolo in base64, ma **solo chi conosce il segreto del server** può modificare il token senza invalidare la firma.

---

## 2. A cosa serve?

### Problema tradizionale (Sessioni)

```
METODO VECCHIO - Sessioni Server-Side:

Utente → [Login] → Server
                ↓
             Server crea una SESSIONE in memoria/database
             Salva: ID utente, timestamp, permessi
                ↓
        ← [ID sessione in cookie] ← 
           (es: SESSIONID=abc123)

Utente → [Richiesta API] → Server
        [Invia SESSIONID=abc123]
                ↓
             Server cerca la sessione nel DB
             Verifica se esiste e è valida
                ↓
        ← [Dati richiesti] ←

PROBLEMA: ❌ Server deve ricordarsi di TUTTE le sessioni
         ❌ Difficile con più server
         ❌ Consuma memoria/database
         ❌ Non scala bene
```

### Soluzione moderna (JWT)

```
METODO NUOVO - JWT Stateless:

Utente → [Login] → Server
                ↓
         Server genera un TOKEN firmato
         Contiene: ID, email, username, scadenza
                ↓
     ← [JWT TOKEN = eyJ...] ←

Utente → [Richiesta API] → Server
    [Header: Authorization: Bearer eyJ...]
                ↓
         Server verifica la FIRMA del token
         (non chiede al DB se è valido)
         Verifica che non sia scaduto
                ↓
         ← [Dati richiesti] ←

VANTAGGI: ✅ Server NON deve memorizzare nulla
          ✅ Ogni server può verificare il token
          ✅ Perfetto per microservizi
          ✅ Funziona con app mobile
          ✅ Ridotto carico sul database
```

### Vantaggi nel progetto iAnime

| Aspetto | Vantaggio |
|---------|-----------|
| **Scalabilità** | Più server possono verificare lo stesso token |
| **Stateless** | Niente DB di sessioni, meno memoria |
| **Mobile-ready** | Perfetto per React e app future |
| **Sicurezza** | Token scade automaticamente (7 giorni) |
| **Standard** | Usato in tutto il web (Google, Facebook, Twitter) |

---

## 3. Come vengono assegnati gli utenti?

### Fase 1: Registrazione

```javascript
// FILE: server/api/authEndpoints.js
// ENDPOINT: POST /v1/auth/register

router.post('/v1/auth/register', async (req, res, next) => {
  const { email, password, username } = req.body;

  // Step 1: Valida i dati
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Campi obbligatori' });
  }

  // Step 2: Hash della password (bcryptjs)
  const hashedPassword = await hashPassword(password);

  // Step 3: Crea l'utente nel database
  const user = await User.create({
    email,
    password: hashedPassword,  // ← Password NON in chiaro!
    username,
  });

  // Step 4: Genera il token JWT
  const token = signUserToken(user);

  // Step 5: Invia risposta
  res.status(201).json({
    message: 'Utente registrato con successo',
    user: sanitizeUser(user),  // Senza password
    token: token               // ← JWT generato qui!
  });
});
```

### Fase 2: Login

```javascript
// FILE: server/api/authEndpoints.js
// ENDPOINT: POST /v1/auth/login

router.post('/v1/auth/login', async (req, res, next) => {
  const { email, password } = req.body;

  // Step 1: Trova l'utente per email
  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  // Step 2: Confronta password (bcryptjs)
  const passwordMatch = await comparePassword(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  // Step 3: Password corretta → Genera JWT
  const token = signUserToken(user);

  // Step 4: Invia il token al client
  res.json({
    message: 'Login effettuato',
    user: sanitizeUser(user),
    token: token  // ← JWT generato qui!
  });
});
```

### Fase 3: Come viene generato il token?

```javascript
// FILE: server/api/auth.js

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const signUserToken = (user) => {
  return jwt.sign(
    {
      // ← PAYLOAD (cosa contiene il token)
      sub: user.id,           // Subject: ID univoco dell'utente
      id: user.id,            // ID duplicato per compatibilità
      email: user.email,      // Email dell'utente
      username: user.username // Username dell'utente
    },
    JWT_SECRET,               // ← CHIAVE SEGRETA (dal file .env)
    {
      expiresIn: JWT_EXPIRES_IN  // ← Scade tra 7 giorni
    }
  );
};
```

### ⚙️ Configurazione nel file .env

```bash
# Chiave segreta per firmare i JWT
# ⚠️ DEVE essere sicura e non condivisa!
JWT_SECRET=my-super-secret-key-12345-change-this-in-production

# Tempo di scadenza del token
JWT_EXPIRES_IN=7d
```

---

## 4. Utilizzo pratico nel progetto

### Come il client invia il token

```javascript
// FILE: client/src/services/api.js

let authToken = null;  // Salva il token ricevuto dal server

const apiCall = async (method, endpoint, body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // ← Aggiunge il token a OGNI richiesta
      ...(authToken && { 
        Authorization: `Bearer ${authToken}` 
      }),
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  return response.json();
};

// Esempi di utilizzo:
export const authService = {
  // Register
  register: (email, password, username) =>
    apiCall('POST', '/v1/auth/register', { email, password, username }),

  // Login
  login: (email, password) =>
    apiCall('POST', '/v1/auth/login', { email, password }),

  // Get profilo (richiesta protetta)
  getProfile: () =>
    apiCall('GET', '/v1/auth/profile'),  // ← Token incluso automaticamente!

  // Get comunità (richiesta protetta)
  getCommunities: () =>
    apiCall('GET', '/api/communities'),  // ← Token incluso automaticamente!
};
```

### Come il server verifica il token

```javascript
// FILE: server/api/auth.js
// Middleware di autenticazione

const authenticateToken = (req, res, next) => {
  // Step 1: Estrae il token dall'header
  // Format: "Authorization: Bearer eyJ..."
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Niente token = Non autenticato
    return res.status(401).json({ error: 'Token richiesto' });
  }

  // Step 2: Verifica la firma del token usando JWT_SECRET
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Token invalido o scaduto
      return res.status(403).json({ error: 'Token non valido o scaduto' });
    }

    // Step 3: Token valido → Estrae i dati e procede
    req.user = user;  // Disponibile in tutta la rotta
    next();
  });
};

// Utilizzo nelle rotte protette:
router.get('/v1/auth/profile', authenticateToken, (req, res) => {
  // ← Se arriviamo qui, il token è stato verificato
  res.json({
    message: 'Profilo utente',
    user: req.user  // Contiene: id, email, username
  });
});
```

### Flusso di una richiesta protetta

```
┌─────────────────────────────────────────────────────────────┐
│ TIMELINE DI UNA RICHIESTA CON JWT                            │
└─────────────────────────────────────────────────────────────┘

[T = 0s] Utente apre login.html
         ↓

[T = 2s] Utente inserisce email + password
         ↓

[T = 3s] Client invia: POST /v1/auth/login
         {
           "email": "mario@example.com",
           "password": "MyPassword123"
         }
         ↓

[T = 5s] Server riceve e verifica le credenziali
         ✓ Email trovata nel database
         ✓ Password corretta (bcrypt)
         ↓

[T = 6s] Server genera JWT:
         token = jwt.sign(
           { id: 42, email: "mario@example.com", username: "mario" },
           JWT_SECRET,
           { expiresIn: '7d' }
         )
         ↓

[T = 7s] Server risponde con token:
         {
           "message": "Login effettuato",
           "user": { "id": 42, "email": "mario@example.com" },
           "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
         }
         ↓

[T = 8s] Client riceve e salva il token
         localStorage.setItem('authToken', token)
         ↓

[T = 10s] Utente clicca su "Visualizza comunità"
          ↓

[T = 12s] Client invia: GET /api/communities
          Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
          ↓

[T = 14s] Server middleware riceve la richiesta
          ✓ Estrae token dall'header
          ✓ Verifica firma con JWT_SECRET
          ✓ Token ancora valido (7 giorni da adesso)
          ✓ Estrae dati: id=42, email="mario@example.com"
          ↓

[T = 15s] Server esegue la rotta protetta
          req.user = { id: 42, email: "mario@example.com", ... }
          ↓

[T = 16s] Server risponde:
          {
            "communities": [...]
          }
          ↓

[T = 17s] Client visualizza comunità ✓
```

---

## 5. Diagramma del flusso completo

```
╔════════════════════════════════════════════════════════════╗
║                   FLUSSO DI AUTENTICAZIONE                 ║
╚════════════════════════════════════════════════════════════╝

STEP 1: REGISTRAZIONE / LOGIN
═══════════════════════════════

┌─────────────────┐          ┌──────────────────────────────┐
│  BROWSER REACT  │          │    SERVER NODEJS EXPRESS     │
│   (Frontend)    │          │      (Backend + JWT)         │
└────────┬────────┘          └──────────────┬───────────────┘
         │                                  │
         │─── POST /auth/register ──────→  │
         │  { email, password, username }   │
         │                                  │
         │                                  │ Step 1: Hash password
         │                                  │ hashedPass = bcrypt(password)
         │                                  │
         │                                  │ Step 2: Create user in DB
         │                                  │ user.password = hashedPass
         │                                  │ user.save()
         │                                  │
         │                                  │ Step 3: Generate JWT
         │                                  │ token = jwt.sign(
         │                                  │   { id, email, username },
         │                                  │   JWT_SECRET,
         │                                  │   { expiresIn: '7d' }
         │                                  │ )
         │                                  │
         │ ← { user, token: 'eyJ...' } ←── │
         │                                  │
         │ Step 4: Save token locally      │
         │ localStorage.authToken = token  │
         │


STEP 2: RICHIESTA PROTETTA (ogni volta che serve)
════════════════════════════════════════════════

┌─────────────────┐          ┌──────────────────────────────┐
│  BROWSER REACT  │          │    SERVER NODEJS EXPRESS     │
│   (Frontend)    │          │      (Backend + JWT)         │
└────────┬────────┘          └──────────────┬───────────────┘
         │                                  │
         │ GET /api/communities            │
         │ Header:                         │
         │ Authorization: Bearer eyJ...    │
         │                                 → 
         │                                  │ Step 1: Extract token
         │                                  │ token = header.split(' ')[1]
         │                                  │
         │                                  │ Step 2: Verify signature
         │                                  │ jwt.verify(token, JWT_SECRET)
         │                                  │
         │                                  │ Step 3: Check expiration
         │                                  │ token.exp > Date.now() ?
         │                                  │
         │                                  │ Step 4: Extract user data
         │                                  │ req.user = decoded token
         │                                  │ { id, email, username }
         │                                  │
         │                                  │ Step 5: Execute route
         │                                  │ Query DB using req.user.id
         │                                  │
         │ ← { communities: [...] } ←────── │
         │                                  │


STEP 3: TOKEN SCADUTO
════════════════════

┌─────────────────┐          ┌──────────────────────────────┐
│  BROWSER REACT  │          │    SERVER NODEJS EXPRESS     │
│   (Frontend)    │          │      (Backend + JWT)         │
└────────┬────────┘          └──────────────┬───────────────┘
         │                                  │
         │ GET /api/communities            │
         │ Header:                         │
         │ Authorization: Bearer eyJ...    │
         │ (Token di 8 giorni fa)          │
         │                                 →
         │                                  │ jwt.verify(token, SECRET)
         │                                  │
         │                                  │ ❌ Token scaduto!
         │                                  │ exp: 1715601600 < now: 1715900000
         │                                  │
         │ ← 403 Forbidden ←──────────────── │
         │   { error: 'Token scaduto' }    │
         │                                  │
         │ Step: Reindirizza a login      │
         │ window.location = '/login'     │
         │
```

---

## 6. Sicurezza nell'implementazione

### Cosa è protetto nel tuo progetto?

| Elemento | Protezione | Come |
|----------|-----------|------|
| **Password** | ✅ Hash bcryptjs | Non salvata in chiaro nel DB |
| **Token** | ✅ Firmato digitalmente | HMAC-SHA256 con JWT_SECRET |
| **Scadenza** | ✅ 7 giorni | expiresIn: '7d' |
| **Trasmissione** | ✅ HTTPS (in produzione) | Encrypt token in transit |
| **Accesso** | ✅ Bearer Token | Solo con token valido |

### Flusso di sicurezza password

```javascript
// REGISTRAZIONE
User input: "MyPassword123"
              ↓
         hashPassword()
         bcryptjs.hash(password, 10)  ← Genera hash univoco
              ↓
         Database: password = "$2a$10$N9qo8uLO..."  ← Hash, non password!


// LOGIN
User input: "MyPassword123"
              ↓
         Password nel DB: "$2a$10$N9qo8uLO..."
              ↓
         comparePassword(input, dbPassword)
         bcryptjs.compare(input, "$2a$10$N9qo8uLO...")
              ↓
         ✓ Match! Genera JWT
         ❌ No match! Errore 401
```

### Perché JWT_SECRET deve essere segreto?

```
Se qualcuno conosce JWT_SECRET, può:
❌ Creare un falso JWT
❌ Impersonare qualsiasi utente
❌ Accedere a dati protetti

Se non lo conosce:
✅ Può leggere i dati del token
✅ Ma non può modificarli
✅ La firma non sarà valida
✅ Il server lo rifiuterà
```

### Checklist di sicurezza

- ✅ **JWT_SECRET** diverso per ogni ambiente (dev ≠ prod)
- ✅ **Scadenza token** impostata (7 giorni)
- ✅ **Password hashate** con bcryptjs
- ✅ **HTTPS** in produzione (non HTTP!)
- ✅ **Token in localStorage** NON accessibile da JavaScript (with HttpOnly flag)
- ✅ **2FA** implementato nel progetto come protezione aggiuntiva

---

## 7. Conclusioni

### Riassunto JWT

| Aspetto | Risposta |
|---------|----------|
| **Cos'è?** | Token testuale autofirmato con 3 parti: Header.Payload.Signature |
| **A cosa serve?** | Autenticazione stateless senza sessioni server |
| **Come funziona?** | Server firma il token, client lo invia, server verifica la firma |
| **Sicurezza?** | Firma digitale + scadenza + password hashate |
| **Nel tuo progetto?** | Proteggono tutte le API tra React e Node.js |

### Vantaggi JWT vs Sessioni

```
SESSIONI TRADIZIONALI          JWT MODERNO
────────────────────          ──────────────
Server ricorda tutto     ➜      Server non ricorda nulla
Legato al server         ➜      Stateless
Difficile da scalare     ➜      Facile da scalare
Memoria piena            ➜      Meno carico
Complesso                ➜      Semplice

                        WINNER: JWT 🏆
```

### Flow finale (Cheat Sheet)

```
1️⃣  LOGIN
    Client → email + password → Server
    Server genera JWT
    Server → token → Client
    Client salva token

2️⃣  RICHIESTA PROTETTA
    Client → richiesta + token nel header → Server
    Server verifica firma del token
    Server → dati richiesti → Client

3️⃣  TOKEN SCADUTO (dopo 7 giorni)
    Client → richiesta + token scaduto → Server
    Server verifica → Token scaduto!
    Server → 403 Forbidden → Client
    Client reindirizza a login
```

---

## 📚 Riferimenti nel progetto

- **Generazione JWT**: [server/api/auth.js](../server/api/auth.js) - `signUserToken()`
- **Verifica JWT**: [server/api/auth.js](../server/api/auth.js) - `authenticateToken()`
- **Login endpoint**: [server/api/authEndpoints.js](../server/api/authEndpoints.js) - `POST /v1/auth/login`
- **Register endpoint**: [server/api/authEndpoints.js](../server/api/authEndpoints.js) - `POST /v1/auth/register`
- **Client API calls**: [client/src/services/api.js](../client/src/services/api.js) - `apiCall()`

---

## 🎓 Pronto per la presentazione!

Questo documento contiene tutto ciò che serve per una presentazione completa sui JWT. Puoi:

✅ Leggere le sezioni in ordine  
✅ Mostrare i diagrammi ASCII  
✅ Spiegare il codice passo per passo  
✅ Dimostrare il flusso nel tuo progetto GitHub  
✅ Rispondere a domande con gli esempi forniti  

**Buona presentazione!** 🚀
