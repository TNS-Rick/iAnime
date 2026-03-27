# Configurazione MySQL per iAnime

Il progetto iAnime è stato adattato per usare **MySQL** invece di MongoDB.

## Setup Rapido

### 1. Installa MySQL su Linux (Codespaces)

```bash
# Aggiorna i pacchetti
sudo apt update

# Installa MySQL Server
sudo apt install -y mysql-server

# Avvia il servizio
sudo service mysql start

# Verifica che sia in esecuzione
sudo service mysql status
```

### 2. Configura MySQL

```bash
# Accedi come root (la prima volta non richiede password)
sudo mysql -u root

# Nel client MySQL, esegui:
sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_password';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Configura le variabili d'ambiente

Crea un file `.env` nella cartella `server/`:

```bash
cd /workspaces/iAnime/server
cp ../../.env.example .env
```

Modifica `.env` con i tuoi dati:

```env
# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ianime

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development
```

### 4. Installa dipendenze backend

```bash
cd /workspaces/iAnime/server
npm install
```

### 5. Avvia il server

```bash
npm start
```

Il server creerà automaticamente il database e le tabelle al primo avvio.

### 6. Seed del database (opzionale)

```bash
npm run seed
```

## Struttura dei Modelli

I modelli sono disponibili in `/workspaces/iAnime/server/models/`:

- **User.js** - Gestione utenti (registrazione, login, profilo)
- **Anime.js** - Catalogo anime
- **Community.js** - Comunità e server
- **Channel.js** - Canali di testo/voce
- **ChannelGroup.js** - Organizzazione canali
- **Message.js** - Messaggi in canali e DM
- **DirectMessage.js** - Sessioni di chat diretta
- **Role.js** - Ruoli per permessi
- **Friendship.js** - Relazioni amicizia

## Metodi dei Modelli

Ogni modello espone i seguenti metodi:

```javascript
const User = require('./models/User');

// Creare
await User.create({ email: '...', password: '...', username: '...' });

// Leggere
await User.findById(1);
await User.findByEmail('test@example.com');
await User.findByUsername('testuser');
await User.findAll(limit, offset);

// Aggiornare
await User.update(userId, { bio: 'Nuovo bio', theme: 'dark' });

// Eliminare
await User.softDelete(userId);  // Soft delete (salva deletedAt)
await User.delete(userId);      // Hard delete
```

## Usare i Modelli nelle API

Esempio di utilizzo nelle API:

```javascript
const express = require('express');
const { User, Anime, Community } = require('../models');

const router = express.Router();

// Creare utente
router.post('/users', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cercare utente
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

## Troubleshooting

### MySQL non si avvia
```bash
sudo service mysql restart
```

### Errore di connessione
Verifica che MySQL sia in esecuzione e le credenziali siano corrette nel `.env`.

### Reset del database
```bash
npm run seed
```

Questo elimina e ricrea tutte le tabelle.

## Architettura Dati

### JSON Fields
Alcuni campi sono memorizzati come JSON in MySQL:
- `notifications`, `friendsList`, `blockedUsers`, `communities` (User)
- `platforms`, `hashtags` (Anime)
- `roles`, `categories`, `channelGroups`, `members`, `pinnedMessages` (Community)
- `permissions`, `members` (Role)
- `messages`, `reactions`, `mentions` (Message)

I modelli gestiscono automaticamente la serializzazione/deserializzazione.

### Foreign Keys
Relazioni tra tabelle:
- `communities.adminId` → `users.id`
- `messages.authorId` → `users.id`
- `messages.channelId` → `channels.id`
- `messages.dmSessionId` → `direct_messages.id`
- `friendships.requester` → `users.id`
- `friendships.recipient` → `users.id`

### Soft Deletes
Tutte le tabelle hanno un campo `deletedAt` per soft delete (cancellazione logica).
Le query automaticamente escludono i record con `deletedAt IS NOT NULL`.

## Prossimi Passi

1. ✅ Configurare MySQL
2. ✅ Implementare modelli di database
3. ⏳ Aggiornare le API per usare i modelli
4. ⏳ Implementare Socket.io per chat real-time
5. ⏳ Aggiungere autenticazione JWT
6. ⏳ Testare con Postman o Insomnia
