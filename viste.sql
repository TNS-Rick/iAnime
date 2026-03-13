-- Titolo del file: raccoglie tutte le query SQL oggi usate da iAnime.
-- Nota generale: i placeholder `?` vengono valorizzati dal backend con `mysql2`.

-- Separatore visivo della prima sezione del file.
-- Sezione dedicata al reset completo dello schema prima del seed.
-- Separatore visivo della prima sezione del file.

-- Disabilita temporaneamente i vincoli di chiave esterna per permettere i DROP in cascata logica.
SET FOREIGN_KEY_CHECKS = 0;
-- Elimina la tabella delle amicizie se esiste già.
DROP TABLE IF EXISTS friendships;
-- Elimina la tabella dei messaggi se esiste già.
DROP TABLE IF EXISTS messages;
-- Elimina la tabella delle chat dirette se esiste già.
DROP TABLE IF EXISTS direct_messages;
-- Elimina la tabella delle community se esiste già.
DROP TABLE IF EXISTS communities;
-- Elimina la tabella dei gruppi di canali se esiste già.
DROP TABLE IF EXISTS channel_groups;
-- Elimina la tabella dei canali se esiste già.
DROP TABLE IF EXISTS channels;
-- Elimina la tabella dei ruoli se esiste già.
DROP TABLE IF EXISTS roles;
-- Elimina la tabella degli anime se esiste già.
DROP TABLE IF EXISTS animes;
-- Elimina la tabella degli utenti se esiste già.
DROP TABLE IF EXISTS users;
-- Riabilita i controlli sulle chiavi esterne dopo il reset.
SET FOREIGN_KEY_CHECKS = 1;

-- Separatore visivo della seconda sezione del file.
-- Sezione dedicata alla creazione dello schema applicativo.
-- Separatore visivo della seconda sezione del file.

-- Crea la tabella `users` se non è già presente.
CREATE TABLE IF NOT EXISTS users (
  -- Identificatore numerico univoco dell'utente, incrementato automaticamente.
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Email dell'utente, obbligatoria.
  email VARCHAR(255) NOT NULL,
  -- Password hashata dell'utente, obbligatoria.
  password VARCHAR(255) NOT NULL,
  -- Username dell'utente, obbligatorio e limitato a 20 caratteri.
  username VARCHAR(20) NOT NULL,
  -- Biografia opzionale dell'utente.
  bio TEXT NULL,
  -- URL dell'immagine profilo; di default stringa vuota.
  profileImage VARCHAR(255) NOT NULL DEFAULT '',
  -- Colore del nome mostrato a schermo.
  displayNameColor VARCHAR(20) NOT NULL DEFAULT '#000000',
  -- Stile della cornice del profilo.
  profileFrameStyle VARCHAR(50) NOT NULL DEFAULT 'default',
  -- Tema grafico preferito.
  theme ENUM('light', 'dark', 'auto') NOT NULL DEFAULT 'auto',
  -- Modalità di visualizzazione chiara o scura.
  displayMode ENUM('light', 'dark') NOT NULL DEFAULT 'light',
  -- Lingua preferita dell'utente.
  language VARCHAR(10) NOT NULL DEFAULT 'it',
  -- Oggetto JSON con le preferenze di notifica.
  notifications JSON NOT NULL,
  -- Flag premium: 0 = no, 1 = sì.
  isPremium TINYINT(1) NOT NULL DEFAULT 0,
  -- Data di scadenza del premium, se presente.
  premiumExpiresAt DATETIME NULL,
  -- Metodo di pagamento registrato, se presente.
  billingMethod ENUM('credit_card', 'debit_card', 'prepaid') NULL,
  -- Flag 2FA: 0 = disattivato, 1 = attivato.
  twoFAEnabled TINYINT(1) NOT NULL DEFAULT 0,
  -- Metodo di 2FA scelto dall'utente.
  twoFAMethod ENUM('phone', 'email', 'app') NULL,
  -- Eventuale secret associato alla 2FA.
  twoFASecret VARCHAR(255) NULL,
  -- Regola privacy su chi può invitare l'utente.
  whoCanInvite ENUM('all', 'friends', 'none') NOT NULL DEFAULT 'all',
  -- Flag per consentire messaggi da sconosciuti.
  acceptStrangerMessages TINYINT(1) NOT NULL DEFAULT 0,
  -- Array JSON con gli ID amici.
  friendsList JSON NOT NULL,
  -- Array JSON con gli ID utenti bloccati.
  blockedUsers JSON NOT NULL,
  -- Array JSON con gli ID delle community a cui partecipa.
  communities JSON NOT NULL,
  -- Modalità accessibilità per il daltonismo.
  colorblindMode ENUM('normal', 'protanopia', 'deuteranopia', 'tritanopia') NOT NULL DEFAULT 'normal',
  -- Flag per alto contrasto.
  highContrast TINYINT(1) NOT NULL DEFAULT 0,
  -- Dimensione testo preferita.
  textSize DECIMAL(4,2) NOT NULL DEFAULT 0.75,
  -- Dispositivo audio di input preferito.
  audioInputDevice VARCHAR(100) NOT NULL DEFAULT 'default',
  -- Dispositivo audio di output preferito.
  audioOutputDevice VARCHAR(100) NOT NULL DEFAULT 'default',
  -- Volume preferito espresso come intero.
  volume INT NOT NULL DEFAULT 80,
  -- Data dell'ultima modifica username.
  lastUsernameChange DATETIME NULL,
  -- Timestamp di creazione del record.
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Timestamp di ultimo aggiornamento, auto-aggiornato da MySQL.
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Timestamp di soft delete, nullo se il record è attivo.
  deletedAt DATETIME NULL,
  -- Definisce `id` come chiave primaria.
  PRIMARY KEY (id),
  -- Impone unicità sull'email.
  UNIQUE KEY uq_users_email (email),
  -- Impone unicità sullo username.
  UNIQUE KEY uq_users_username (username)
-- Imposta motore e codifica Unicode completa per emoji e caratteri speciali.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crea la tabella `animes` se non è già presente.
CREATE TABLE IF NOT EXISTS animes (
  -- Identificatore numerico univoco dell'anime.
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Titolo dell'anime.
  title VARCHAR(255) NOT NULL,
  -- Descrizione dell'anime.
  description TEXT NULL,
  -- URL dell'immagine di copertina.
  coverImage VARCHAR(255) NOT NULL DEFAULT '',
  -- Valutazione numerica con una cifra decimale.
  rating DECIMAL(3,1) NOT NULL DEFAULT 0.0,
  -- Categoria testuale dell'anime.
  category VARCHAR(255) NOT NULL DEFAULT '',
  -- Stato dell'anime.
  status ENUM('ongoing', 'completed', 'upcoming') NOT NULL DEFAULT 'ongoing',
  -- ID esterno Jikan, se disponibile.
  jikanId INT NULL,
  -- ID esterno AniList, se disponibile.
  anilistId INT NULL,
  -- ID esterno Kitsu, se disponibile.
  kitsuId INT NULL,
  -- Elenco piattaforme in formato JSON.
  platforms JSON NOT NULL,
  -- Elenco hashtag in formato JSON.
  hashtags JSON NOT NULL,
  -- Numero di utenti che seguono l'anime.
  followedByCount INT NOT NULL DEFAULT 0,
  -- Timestamp di creazione del record.
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Timestamp di ultimo aggiornamento.
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Timestamp di soft delete.
  deletedAt DATETIME NULL,
  -- Definisce `id` come chiave primaria.
  PRIMARY KEY (id),
  -- Impone unicità sul titolo dell'anime.
  UNIQUE KEY uq_animes_title (title)
-- Imposta motore e codifica Unicode completa per la tabella `animes`.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crea la tabella `roles` se non è già presente.
CREATE TABLE IF NOT EXISTS roles (
  -- Identificatore univoco del ruolo.
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Nome del ruolo.
  name VARCHAR(100) NOT NULL,
  -- Permessi del ruolo in formato JSON.
  permissions JSON NOT NULL,
  -- Colore associato al ruolo.
  color VARCHAR(20) NOT NULL DEFAULT '#000000',
  -- Membri del ruolo in formato JSON.
  members JSON NOT NULL,
  -- Timestamp di creazione.
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Timestamp di ultimo aggiornamento.
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Timestamp di soft delete.
  deletedAt DATETIME NULL,
  -- Definisce `id` come chiave primaria.
  PRIMARY KEY (id)
-- Imposta motore e codifica Unicode completa per la tabella `roles`.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crea la tabella `channels` se non è già presente.
CREATE TABLE IF NOT EXISTS channels (
  -- Identificatore univoco del canale.
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Nome del canale.
  name VARCHAR(100) NOT NULL,
  -- Tipo del canale: testuale o vocale.
  type ENUM('text', 'voice') NOT NULL,
  -- Hashtag associati al canale in formato JSON.
  hashtags JSON NOT NULL,
  -- Numero massimo di membri ammessi.
  maxMembers INT NOT NULL DEFAULT 10,
  -- Permessi del canale in formato JSON.
  permissions JSON NOT NULL,
  -- ID dei messaggi del canale in formato JSON.
  messages JSON NOT NULL,
  -- ID dei membri del canale in formato JSON.
  members JSON NOT NULL,
  -- Timestamp di creazione.
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Timestamp di ultimo aggiornamento.
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Timestamp di soft delete.
  deletedAt DATETIME NULL,
  -- Definisce `id` come chiave primaria.
  PRIMARY KEY (id)
-- Imposta motore e codifica Unicode completa per la tabella `channels`.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crea la tabella `channel_groups` se non è già presente.
CREATE TABLE IF NOT EXISTS channel_groups (
  -- Identificatore univoco del gruppo di canali.
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Nome del gruppo di canali.
  name VARCHAR(100) NOT NULL,
  -- Elenco degli ID dei canali nel gruppo in formato JSON.
  channels JSON NOT NULL,
  -- Timestamp di creazione.
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Timestamp di ultimo aggiornamento.
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Timestamp di soft delete.
  deletedAt DATETIME NULL,
  -- Definisce `id` come chiave primaria.
  PRIMARY KEY (id)
-- Imposta motore e codifica Unicode completa per la tabella `channel_groups`.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crea la tabella `communities` se non è già presente.
CREATE TABLE IF NOT EXISTS communities (
  -- Identificatore univoco della community.
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Nome della community.
  name VARCHAR(150) NOT NULL,
  -- Descrizione della community.
  description TEXT NULL,
  -- ID dell'utente amministratore della community.
  adminId INT UNSIGNED NOT NULL,
  -- Elenco dei ruoli associati alla community in formato JSON.
  roles JSON NOT NULL,
  -- Elenco categorie della community in formato JSON.
  categories JSON NOT NULL,
  -- Elenco gruppi di canali in formato JSON.
  channelGroups JSON NOT NULL,
  -- Elenco membri della community in formato JSON.
  members JSON NOT NULL,
  -- Elenco messaggi pinnati in formato JSON.
  pinnedMessages JSON NOT NULL,
  -- Timestamp di creazione.
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Timestamp di ultimo aggiornamento.
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Timestamp di soft delete.
  deletedAt DATETIME NULL,
  -- Definisce `id` come chiave primaria.
  PRIMARY KEY (id),
  -- Impone unicità del nome community per amministratore.
  UNIQUE KEY uq_communities_admin_name (adminId, name),
  -- Definisce il vincolo di chiave esterna verso `users.id`.
  CONSTRAINT fk_communities_admin FOREIGN KEY (adminId) REFERENCES users (id)
-- Imposta motore e codifica Unicode completa per la tabella `communities`.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crea la tabella `direct_messages` se non è già presente.
CREATE TABLE IF NOT EXISTS direct_messages (
  -- Identificatore univoco della sessione DM.
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Elenco partecipanti della DM in formato JSON.
  participants JSON NOT NULL,
  -- Elenco messaggi collegati alla DM in formato JSON.
  messages JSON NOT NULL,
  -- Timestamp di creazione.
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Timestamp di ultimo aggiornamento.
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Timestamp di soft delete.
  deletedAt DATETIME NULL,
  -- Definisce `id` come chiave primaria.
  PRIMARY KEY (id)
-- Imposta motore e codifica Unicode completa per la tabella `direct_messages`.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crea la tabella `messages` se non è già presente.
CREATE TABLE IF NOT EXISTS messages (
  -- Identificatore univoco del messaggio.
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Contenuto testuale del messaggio.
  content TEXT NOT NULL,
  -- ID dell'autore del messaggio.
  authorId INT UNSIGNED NOT NULL,
  -- ID del canale, se il messaggio appartiene a un canale.
  channelId INT UNSIGNED NULL,
  -- ID della sessione DM, se il messaggio appartiene a una chat privata.
  dmSessionId INT UNSIGNED NULL,
  -- Timestamp logico del messaggio.
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Flag che indica se il messaggio è pinnato.
  isPinned TINYINT(1) NOT NULL DEFAULT 0,
  -- Reazioni del messaggio in formato JSON.
  reactions JSON NOT NULL,
  -- Menzioni contenute nel messaggio in formato JSON.
  mentions JSON NOT NULL,
  -- Timestamp di soft delete.
  deletedAt DATETIME NULL,
  -- Definisce `id` come chiave primaria.
  PRIMARY KEY (id),
  -- Crea un indice per recuperare rapidamente i messaggi di un canale ordinati nel tempo.
  KEY idx_messages_channel_timestamp (channelId, timestamp),
  -- Crea un indice per recuperare rapidamente i messaggi di una DM ordinati nel tempo.
  KEY idx_messages_dm_timestamp (dmSessionId, timestamp),
  -- Chiave esterna verso l'autore nella tabella `users`.
  CONSTRAINT fk_messages_author FOREIGN KEY (authorId) REFERENCES users (id),
  -- Chiave esterna verso il canale nella tabella `channels`.
  CONSTRAINT fk_messages_channel FOREIGN KEY (channelId) REFERENCES channels (id),
  -- Chiave esterna verso la sessione DM nella tabella `direct_messages`.
  CONSTRAINT fk_messages_dm FOREIGN KEY (dmSessionId) REFERENCES direct_messages (id)
-- Imposta motore e codifica Unicode completa per la tabella `messages`.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crea la tabella `friendships` se non è già presente.
CREATE TABLE IF NOT EXISTS friendships (
  -- Identificatore univoco della relazione di amicizia.
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- ID dell'utente che invia la richiesta.
  requester INT UNSIGNED NOT NULL,
  -- ID dell'utente che riceve la richiesta.
  recipient INT UNSIGNED NOT NULL,
  -- Stato della relazione di amicizia.
  status ENUM('pending', 'accepted', 'blocked') NOT NULL DEFAULT 'pending',
  -- Timestamp di creazione.
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Timestamp di ultimo aggiornamento.
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Timestamp di soft delete.
  deletedAt DATETIME NULL,
  -- Definisce `id` come chiave primaria.
  PRIMARY KEY (id),
  -- Impedisce richieste duplicate tra la stessa coppia requester/recipient.
  UNIQUE KEY uq_friendships_requester_recipient (requester, recipient),
  -- Indice utile per cercare richieste ricevute per stato.
  KEY idx_friendships_recipient_status (recipient, status),
  -- Chiave esterna verso l'utente che richiede.
  CONSTRAINT fk_friendships_requester FOREIGN KEY (requester) REFERENCES users (id),
  -- Chiave esterna verso l'utente ricevente.
  CONSTRAINT fk_friendships_recipient FOREIGN KEY (recipient) REFERENCES users (id)
-- Imposta motore e codifica Unicode completa per la tabella `friendships`.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Separatore visivo della terza sezione del file.
-- Sezione dedicata alle query DML usate dal seed e dall'applicazione.
-- Separatore visivo della terza sezione del file.

-- Inserisce un utente completo con dati premium e profilo avanzato.
INSERT INTO users (
  -- Colonne valorizzate nella prima variante di inserimento utente.
  email, password, username, bio, profileImage, displayNameColor, isPremium,
  -- Colonne aggiuntive premium/notifiche/privacy della prima variante.
  premiumExpiresAt, notifications, twoFAEnabled, whoCanInvite,
  -- Colonne JSON e flag finali della prima variante.
  acceptStrangerMessages, friendsList, blockedUsers, communities
-- Valori parametrizzati passati dal backend nello stesso ordine delle colonne.
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- Inserisce un utente standard senza scadenza premium e senza metodo 2FA.
INSERT INTO users (
  -- Colonne valorizzate nella seconda variante di inserimento utente.
  email, password, username, bio, profileImage, notifications, isPremium,
  -- Colonne privacy e liste JSON della seconda variante.
  twoFAEnabled, whoCanInvite, acceptStrangerMessages, friendsList, blockedUsers, communities
-- Valori parametrizzati per la seconda variante.
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- Inserisce un utente con 2FA attiva e metodo specificato.
INSERT INTO users (
  -- Colonne base e notifiche per la terza variante di inserimento utente.
  email, password, username, bio, profileImage, notifications, isPremium,
  -- Colonne 2FA e privacy per la terza variante.
  twoFAEnabled, twoFAMethod, whoCanInvite, acceptStrangerMessages,
  -- Liste JSON della terza variante.
  friendsList, blockedUsers, communities
-- Valori parametrizzati per la terza variante.
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- Inserisce un anime nel catalogo locale.
INSERT INTO animes (
  -- Colonne valorizzate durante il seed degli anime.
  title, description, coverImage, rating, category, status, jikanId, platforms, hashtags, followedByCount
-- Valori parametrizzati per i campi dell'anime.
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- Inserisce un ruolo di community con permessi e membri serializzati in JSON.
INSERT INTO roles (name, permissions, color, members) VALUES (?, ?, ?, ?);

-- Inserisce un canale con hashtag, permessi, messaggi e membri.
INSERT INTO channels (name, type, hashtags, maxMembers, permissions, messages, members)
-- Valori parametrizzati del canale.
VALUES (?, ?, ?, ?, ?, ?, ?);

-- Inserisce un gruppo di canali con il suo elenco JSON di canali.
INSERT INTO channel_groups (name, channels) VALUES (?, ?);

-- Inserisce una community con struttura e membri già serializzati in JSON.
INSERT INTO communities (
  -- Colonne valorizzate durante il seed della community.
  name, description, adminId, roles, categories, channelGroups, members, pinnedMessages
-- Valori parametrizzati della community.
) VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- Inserisce un messaggio associato a un canale.
INSERT INTO messages (content, authorId, channelId, reactions, mentions)
-- Valori parametrizzati del messaggio.
VALUES (?, ?, ?, ?, ?);

-- Aggiorna la lista JSON dei messaggi associati a un canale specifico.
UPDATE channels SET messages = ? WHERE id = ?;
-- Aggiorna la lista JSON dei messaggi pinnati di una community specifica.
UPDATE communities SET pinnedMessages = ? WHERE id = ?;
-- Aggiorna sia le community dell'utente sia la sua lista amici.
UPDATE users SET communities = ?, friendsList = ? WHERE id = ?;
-- Aggiorna solo la lista delle community di un utente.
UPDATE users SET communities = ? WHERE id = ?;

-- Inserisce una relazione di amicizia con lo stato desiderato.
INSERT INTO friendships (requester, recipient, status) VALUES (?, ?, ?);
-- Inserisce una sessione di messaggi diretti con partecipanti e messaggi JSON.
INSERT INTO direct_messages (participants, messages) VALUES (?, ?);
