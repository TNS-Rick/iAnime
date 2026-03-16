# iAnime Database - MySQL

## Struttura Database

Il database iAnime è costruito con MySQL e utilizza query SQL raw tramite `mysql2` per la creazione dello schema, il seed e l'accesso ai dati.

### Tabelle Principali

#### 1. **Users** (Utenti)
Schema completo per la gestione degli utenti con:
- **Informazioni di base**: email, password (hashata con bcrypt), username
- **Profilo**: bio, immagine profilo, colore nome (premium), cornice profilo (premium)
- **Impostazioni**: tema, modalità display, lingua, notifiche
- **Premium**: flag isPremium, scadenza, metodo di pagamento
- **2FA**: abilitato, metodo (phone/email/app), secret
- **Privacy**: chi può invitare, accettare messaggi sconosciuti
- **Relazioni**: lista amici, utenti bloccati, comunità
- **Accessibilità**: modalità daltonici, alto contrasto, dimensione testo
- **Audio**: dispositivi input/output, volume

**Note**: 
- Username univoco (case-insensitive), max 20 caratteri
- Last username change tracking (modificabile ogni 5 giorni)
- Soft delete con campo `deletedAt`

#### 2. **Animes** (Anime)
Informazioni sugli anime con:
- **Base**: titolo, descrizione, cover image, rating (0-10), categoria, status
- **API esterne**: jikanId, anilistId, kitsuId
- **Piattaforme**: array di oggetti con nome, url, paese, tipo streaming
- **Community**: hashtags, numero di follower

#### 3. **Communities** (Comunità)
Gruppi sociali per gli utenti:
- **Base**: nome, descrizione, admin ID, membri
- **Struttura**: ruoli, categorie, gruppi di canali
- **Contenuto**: messaggi pinnati
- **Indice univoco**: adminId + name (nome univoco per admin)

#### 4. **Roles** (Ruoli)
Ruoli all'interno delle comunità:
- **Permessi**: array di permessi (kick, deleteMsg, mute, manageRoles, etc.)
- **Display**: colore per il nome display
- **Membri**: array di user IDs

#### 5. **ChannelGroups** (Gruppi di Canali)
Cartelle organizzative per canali:
- Nome del gruppo
- Array di canali

#### 6. **Channels** (Canali)
Canali testuali o vocali:
- **Tipo**: text o voice
- **Hashtags**: per categorizzazione
- **Max membri**: max 10 per canali vocali
- **Permessi**: basati su role (canRead, canWrite)
- **Messaggi**: reference ai messaggi

#### 7. **Messages** (Messaggi)
Messaggi in canali o DM:
- **Content**: testo del messaggio
- **Author**: ID utente
- **Target**: channelId o dmSessionId
- **Metadata**: timestamp, isPinned
- **Interazioni**: reactions (emoji + utenti), mentions
- **Indici**: ottimizzati per channelId e dmSessionId con timestamp

#### 8. **DirectMessages** (Sessioni DM)
Chat private tra utenti:
- **Participants**: array di 2 user IDs
- **Messages**: reference ai messaggi
- **Indice**: su participants per lookup veloce

#### 9. **Friendships** (Amicizie)
Relazioni tra utenti:
- **Requester**: utente che richiede
- **Recipient**: utente ricevente
- **Status**: pending, accepted, blocked
- **Indice univoco**: requester + recipient (no duplicati)

## Setup e Utilizzo

## API intermedia backend-database
- L'accesso ai dati passa attraverso endpoint REST sotto `/api/v1/*`
- La documentazione completa è disponibile in [server/API_ENDPOINTS.md](../API_ENDPOINTS.md)
- La documentazione JSON runtime è disponibile in `/api/docs`

### Prerequisiti
- XAMPP installato (con modulo MySQL/MariaDB attivo)
- Node.js installato

### Installazione
```bash
cd server
npm install
```

### Configurazione
Crea un file `.env` nella directory server:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ianime
DB_USER=root
DB_PASSWORD=
JWT_SECRET=your_jwt_secret_key_change_this
IPINFO_TOKEN=demo
JUSTWATCH_API_KEY=your_justwatch_api_key
PORT=5000
NODE_ENV=development
```

Per XAMPP locale, i valori tipici sono:
- `DB_HOST=localhost`
- `DB_PORT=3306`
- `DB_USER=root`
- `DB_PASSWORD=` (vuota di default, se non l'hai modificata)
- `DB_NAME=ianime`

Se usi phpMyAdmin, assicurati che il servizio MySQL di XAMPP sia avviato prima di lanciare il backend.

### Inizializzazione Database
Per popolare il database con dati di esempio:
```bash
npm run seed
```

Questo creerà:
- 3 utenti di esempio (naruto_fan, demon_slayer_fan, tanjiro_sama)
- 3 anime (Naruto Shippuden, Demon Slayer, Jujutsu Kaisen)
- 1 comunità "Naruto Central" con canali, ruoli, messaggi
- 2 amicizie
- 1 sessione di messaggi diretti

### Avvio Server
```bash
npm start
```

Il server creerà il database se non esiste e si connetterà automaticamente a MySQL all'avvio.

## Convenzioni

### Timestamps
- Le tabelle MySQL usano `createdAt` e `updatedAt` (ISO 8601, UTC)
- `updatedAt` viene aggiornato automaticamente da MySQL tramite `ON UPDATE CURRENT_TIMESTAMP`

### Soft Deletes
- Tutti i modelli hanno campo `deletedAt`
- Non cancellare record direttamente, impostare `deletedAt` per audit trail

### Case Sensitivity
- Username: case-insensitive, univoco
- Email: lowercase, univoco
- Community names: case-sensitive, univoco per admin

### Limiti
- Username: max 20 caratteri alfanumerici
- Bio: max 500 caratteri  
- Canali vocali: max 10 membri
- Username change: ogni 5 giorni

## Relazioni e Query

Le relazioni sono gestite con chiavi esterne SQL (ad esempio `communities.adminId -> users.id`, `messages.authorId -> users.id`) e con query dirette tramite `mysql2`.

Per i campi strutturati (`notifications`, `roles`, `members`, `hashtags`, ecc.) il backend salva JSON serializzato in colonne di tipo `JSON` e lo normalizza in lettura.

## Indici

Gli indici sono configurati per ottimizzare le query comuni:
- `User`: username, email (unique)
- `Community`: adminId + name (unique)
- `Friendship`: requester + recipient (unique), recipient + status
- `Message`: channelId + timestamp, dmSessionId + timestamp
- `DirectMessage`: participants

## Schema Evolution

Per modificare gli schemi:
1. Aggiorna le istruzioni SQL in `server/db/schema.js`
2. Se serve riallineare lo schema locale, esegui `npm run seed` (reset + ricreazione tabelle + dati demo)
3. Per migrazioni senza reset dati, crea script SQL o script Node dedicati in `server/db/`
