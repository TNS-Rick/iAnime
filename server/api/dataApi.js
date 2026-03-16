// Importa i moduli necessari e le utilita' condivise.
const express = require('express');
const {
  authenticateToken, // Middleware che verifica e decodifica i token JWT.
  comparePassword, // Utility che confronta password in chiaro e password hashata.
  getActiveUserById, // Recupera un utente attivo tramite ID.
  hashPassword, // Utility che produce l'hash sicuro della password.
  sanitizeUser, // Rimuove i dati sensibili dall'oggetto utente.
  signUserToken, // Genera un token JWT per l'utente autenticato.
} = require('./auth');
const { execute } = require('../db/connection'); // Esegue query SQL parametrizzate sul database.
const { resources, resourceMap } = require('./resources'); // Espone i metadati delle risorse CRUD.

const router = express.Router(); // Crea il router Express usato dal layer API.

// Elenco centralizzato dei permessi supportati per la gestione delle community.
// Viene riusato per riconoscere i privilegi completi dell'admin e per costruire
// la risposta dell'endpoint che espone le capability dell'utente autenticato.
const ALL_COMMUNITY_PERMISSIONS = [
  'kick', // Permission to remove members from the community
  'deleteMsg', // Permission to delete messages
  'mute', // Permission to mute members
  'manageRoles', // Permission to manage roles within the community
  'manageChannels', // Permission to manage channels within the community
  'manageCategories', // Permission to manage categories within the community
  'pinMessages', // Permission to pin messages in channels
];

// Prova a deserializzare i campi JSON letti dal database.
// Se il valore non e' una stringa JSON valida, viene restituito invariato.
const parseJsonValue = (value) => {
  if (value === null || value === undefined) {
    return value; // Se il valore manca, lo restituisce senza trasformazioni.
  }

  if (typeof value !== 'string') {
    return value; // Se non e' una stringa, assume che sia gia' un valore pronto all'uso.
  }

  try {
    return JSON.parse(value); // Prova a convertire la stringa JSON nel corrispondente valore JavaScript.
  } catch {
    return value; // Se il parsing fallisce, mantiene il valore originale.
  }
};

// Normalizza un valore in array per evitare controlli ripetuti nei punti in cui
// il dato potrebbe essere nullo, non inizializzato o gia' nel formato corretto.
const ensureArray = (value) => {
  if (Array.isArray(value)) {
    return value; // Se il valore e' gia' un array, lo restituisce immediatamente.
  }

  return []; // In tutti gli altri casi usa un array vuoto come fallback.
};

// Normalizza un record letto dal database applicando i metadati della risorsa.
const normalizeRecord = (resource, record) => {
  // Crea una copia superficiale per evitare side effect sul record originale.
  const normalized = { ...record };

  // Converte in oggetti/array JavaScript i campi che in tabella sono memorizzati come JSON.
  for (const field of resource.jsonFields) {
    if (field in normalized) {
      // Deserializza il campo JSON cosi' da avere array/oggetti invece di stringhe.
      normalized[field] = parseJsonValue(normalized[field]);
    }
  }

  // Uniforma i flag booleani restituiti da MySQL, che arrivano come 0/1.
  for (const field of resource.booleanFields) {
    if (field in normalized && normalized[field] !== null) {
      // Converte i flag numerici MySQL in booleani JavaScript.
      normalized[field] = Boolean(normalized[field]);
    }
  }

  // Rimuove eventuali campi sensibili prima di esporre il record via API.
  for (const field of resource.sensitiveFields || []) {
    // Elimina ogni campo dichiarato come sensibile prima della risposta API.
    delete normalized[field];
  }

  // Restituisce il record finale, gia' pronto per il client.
  return normalized;
};

// Filtra il payload in ingresso e serializza i campi JSON prima del salvataggio.
const normalizePayload = (resource, payload = {}) => {
  // Contiene solo i campi ammessi per scrittura dalla risorsa.
  const cleanPayload = {};

  // Accetta solo i campi dichiarati come scrivibili nella definizione della risorsa.
  // I campi JSON vengono serializzati per essere persistiti correttamente in MySQL.
  for (const field of resource.writableFields) {
    if (payload[field] === undefined) {
      continue;
    }

    cleanPayload[field] = resource.jsonFields.includes(field)
      ? JSON.stringify(payload[field])
      : payload[field];
  }

  // Restituisce il payload pronto per essere usato nelle query SQL.
  return cleanPayload;
};

// Raccoglie tutti i campi obbligatori assenti dal payload corrente.
const validateRequiredFields = (resource, payload) => {
  return resource.requiredFields.filter((field) => payload[field] === undefined || payload[field] === null);
};

// Costruisce una INSERT dinamica in base ai campi realmente presenti nel payload.
const buildInsertStatement = (resource, payload) => {
  // Estrae i nomi dei campi realmente presenti nel payload.
  const fields = Object.keys(payload);
  // Genera un placeholder SQL per ogni campo da inserire.
  const placeholders = fields.map(() => '?').join(', ');
  const sql = `
    INSERT INTO ${resource.tableName}
      (${fields.join(', ')})
    VALUES
      (${placeholders})
  `;
  // Mappa l'ordine dei valori sull'ordine dei campi definiti sopra.
  const params = fields.map((field) => payload[field]);

  return { sql, params };
};

// Costruisce una UPDATE dinamica limitata ai record non soft-deleted.
const buildUpdateStatement = (resource, payload, id) => {
  // Elenca i campi che devono essere aggiornati.
  const fields = Object.keys(payload);
  // Costruisce la clausola SET del tipo "campo = ?" per ogni campo.
  const assignments = fields.map((field) => `${field} = ?`).join(', ');
  const sql = `
    UPDATE ${resource.tableName}
    SET ${assignments}
    WHERE ${resource.primaryKey} = ?
      AND deletedAt IS NULL
  `;
  // Appende l'id del record ai parametri dell'update.
  const params = [...fields.map((field) => payload[field]), id];

  return { sql, params };
};

// Recupera un record attivo per ID, applicando in modo coerente il filtro su deletedAt.
const fetchActiveRecordById = async (resource, id) => {
  // Esegue una SELECT sulla tabella della risorsa limitandosi ai record attivi.
  const [rows] = await execute(
    `
      SELECT *
      FROM ${resource.tableName}
      WHERE ${resource.primaryKey} = ?
        AND deletedAt IS NULL
      LIMIT 1
    `,
    [id]
  );

  // Restituisce il primo record trovato oppure null se assente.
  return rows[0] || null;
};

// Wrapper semantico per leggere una community gia' normalizzata.
const getCommunityById = async (communityId) => {
  const community = await fetchActiveRecordById(resourceMap.communities, communityId);
  return community ? normalizeRecord(resourceMap.communities, community) : null;
};

// Carica un insieme di ruoli da un array di ID, scartando valori non validi.
const getRolesByIds = async (roleIds) => {
  // Converte l'input in un array di numeri validi.
  const ids = ensureArray(roleIds).map(Number).filter(Boolean);

  if (!ids.length) {
    return [];
  }

  // Prepara i placeholder necessari per la clausola IN della query.
  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await execute(
    `
      SELECT *
      FROM roles
      WHERE id IN (${placeholders})
        AND deletedAt IS NULL
    `,
    ids
  );
  // Normalizza i ruoli letti dal DB prima di restituirli al chiamante.
  return rows.map((row) => normalizeRecord(resourceMap.roles, row));
};

// Calcola i permessi di un utente in una community.
// L'admin eredita automaticamente tutti i permessi, mentre gli altri utenti
// ottengono l'unione dei permessi dei ruoli a cui appartengono.
const getCommunityPermissionsForUser = async (communityId, userId) => {
  const community = await getCommunityById(communityId);

  if (!community) {
    return { community: null, isAdmin: false, permissions: [] };
  }

  if (Number(community.adminId) === Number(userId)) {
    return { community, isAdmin: true, permissions: [...ALL_COMMUNITY_PERMISSIONS] };
  }

  const roles = await getRolesByIds(community.roles);
  // Usa un Set per evitare permessi duplicati quando l'utente ha piu' ruoli.
  const permissions = new Set();

  for (const role of roles) {
    // Converte la lista membri del ruolo in numeri per il confronto con l'utente corrente.
    const members = ensureArray(role.members).map(Number);
    if (members.includes(Number(userId))) {
      for (const permission of ensureArray(role.permissions)) {
        // Ogni permesso viene aggiunto una sola volta grazie al Set.
        permissions.add(permission);
      }
    }
  }

  return { community, isAdmin: false, permissions: [...permissions] };
};

// Tutte le mutazioni richiedono autenticazione, tranne la registrazione utente.
const requireAuthForMutation = (resourceName) => resourceName !== 'users';

// In questa versione solo l'admin della community viene considerato gestore completo.
const canManageCommunity = async (communityId, userId) => {
  // Recupera community e ruolo amministrativo dell'utente corrente.
  const { community, isAdmin } = await getCommunityPermissionsForUser(communityId, userId);
  // In questa implementazione solo l'admin puo' gestire l'intera community.
  return { community, allowed: isAdmin };
};

// Applica sia la normalizzazione dei campi JSON/booleani sia la sanitizzazione auth.
const sanitizeUserResponse = (user) => sanitizeUser(normalizeRecord(resourceMap.users, user));

// Imposta i default applicativi usati in fase di registrazione utente.
const applyUserDefaults = (payload) => ({
  // Inizializza i default per il sotto-oggetto notifiche.
  notifications: {
    mention: true,
    friendRequest: true,
    systemNotifications: true,
    communityList: [],
    limitedPeople: [],
  },
  friendsList: [],
  blockedUsers: [],
  communities: [],
  whoCanInvite: 'all',
  acceptStrangerMessages: false,
  twoFAEnabled: false,
  isPremium: false,
  highContrast: false,
  // Il payload originale puo' sovrascrivere i default quando necessario.
  ...payload,
});

// Handler generico per la lista di una risorsa con paginazione limit/offset.
const listHandler = async (resource, req, res) => {
  // Legge il limite richiesto e applica un tetto massimo a 100 record.
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  // Legge l'offset richiesto e impedisce valori negativi.
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const [rows] = await execute(
    `
      SELECT *
      FROM ${resource.tableName}
      WHERE deletedAt IS NULL
      ORDER BY ${resource.primaryKey} DESC
      LIMIT ? OFFSET ?
    `,
    [limit, offset]
  );

  // Normalizza ogni riga letta dal database.
  const items = rows.map((row) => normalizeRecord(resource, row));
  // Restituisce il nome logico della risorsa e la lista dei record trovati.
  res.json({ resource: resource.name, count: items.length, items });
};

// Handler generico per il dettaglio di una singola risorsa.
const getByIdHandler = async (resource, req, res) => {
  // Recupera il record attivo corrispondente all'id richiesto.
  const row = await fetchActiveRecordById(resource, req.params.id);

  if (!row) {
    return res.status(404).json({ error: `${resource.name} non trovato` });
  }

  // Restituisce il record gia' normalizzato per l'API.
  return res.json(normalizeRecord(resource, row));
};

// Flusso di registrazione: applica default, valida, cifra la password e restituisce JWT.
const createUserHandler = async (req, res) => {
  // Seleziona i metadati della risorsa utenti.
  const resource = resourceMap.users;
  // Applica i valori di default al body ricevuto.
  const mergedPayload = applyUserDefaults(req.body);
  // Filtra e serializza il payload secondo le regole della risorsa utenti.
  const payload = normalizePayload(resource, mergedPayload);
  // Verifica che tutti i campi richiesti siano presenti.
  const missingFields = validateRequiredFields(resource, payload);

  if (missingFields.length) {
    return res.status(400).json({ error: 'Campi obbligatori mancanti', missingFields });
  }

  // Hasha la password in chiaro prima di persisterla.
  payload.password = await hashPassword(req.body.password);

  // Costruisce la query di inserimento per il nuovo utente.
  const { sql, params } = buildInsertStatement(resource, payload);
  // Esegue l'inserimento sul database.
  const [result] = await execute(sql, params);
  // Rilegge l'utente appena creato per avere il record persistito dal DB.
  const createdUser = await getActiveUserById(result.insertId);
  // Rimuove campi sensibili dal record utente restituito.
  const sanitizedUser = sanitizeUserResponse(createdUser);
  // Firma il JWT da restituire al client subito dopo la registrazione.
  const token = signUserToken(sanitizedUser);

  return res.status(201).json({ user: sanitizedUser, token });
};

// Handler di creazione condiviso fra tutte le risorse dichiarate in resources.js.
// Qui vengono iniettati i campi derivati dal contesto autenticato prima della persistenza.
const createHandler = async (resource, req, res) => {
  if (resource.name === 'users') {
    // Gli utenti usano il flusso dedicato che crea anche il token JWT.
    return createUserHandler(req, res);
  }

  if (requireAuthForMutation(resource.name) && !req.user) {
    return res.status(401).json({ error: 'Autenticazione richiesta' });
  }

  if (resource.name === 'communities') {
    // L'admin della community viene forzato all'utente autenticato.
    req.body.adminId = req.user.id;
  }

  if (resource.name === 'messages') {
    // L'autore del messaggio coincide sempre con l'utente autenticato.
    req.body.authorId = req.user.id;
  }

  if (resource.name === 'friendships') {
    // Il richiedente dell'amicizia e' l'utente autenticato.
    req.body.requester = req.user.id;
  }

  if (resource.name === 'direct-messages') {
    // La chat privata deve sempre includere l'utente che la sta creando.
    const participants = ensureArray(req.body.participants).map(Number);
    if (!participants.includes(Number(req.user.id))) {
      return res.status(403).json({ error: 'Il creatore della chat deve essere tra i partecipanti' });
    }
  }

  // Normalizza il body mantenendo solo i campi ammessi per la risorsa.
  const payload = normalizePayload(resource, req.body);
  // Controlla la presenza dei campi obbligatori.
  const missingFields = validateRequiredFields(resource, payload);

  if (missingFields.length) {
    return res.status(400).json({ error: 'Campi obbligatori mancanti', missingFields });
  }

  // Costruisce ed esegue la query di inserimento.
  const { sql, params } = buildInsertStatement(resource, payload);
  const [result] = await execute(sql, params);
  // Rilegge il record appena creato per rispondere con dati coerenti.
  const row = await fetchActiveRecordById(resource, result.insertId);

  return res.status(201).json(normalizeRecord(resource, row));
};

// Handler di aggiornamento condiviso, con regole di ownership diverse per ogni risorsa.
const updateHandler = async (resource, req, res) => {
  if (requireAuthForMutation(resource.name) && !req.user) {
    return res.status(401).json({ error: 'Autenticazione richiesta' });
  }

  // Legge il record esistente per poter validare ownership e permessi.
  const existingRow = await fetchActiveRecordById(resource, req.params.id);

  if (!existingRow) {
    return res.status(404).json({ error: `${resource.name} non trovato` });
  }

  // Normalizza il record esistente cosi' da avere i campi JSON gia' deserializzati.
  const existing = normalizeRecord(resource, existingRow);

  if (resource.name === 'users' && Number(req.user?.id) !== Number(req.params.id)) {
    return res.status(403).json({ error: 'Puoi modificare solo il tuo utente' });
  }

  if (resource.name === 'communities') {
    // L'admin resta immutato per evitare passaggi di ownership non controllati.
    const { allowed } = await canManageCommunity(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: 'Solo l\'admin della community può modificarla' });
    }
    req.body.adminId = existing.adminId;
  }

  if (resource.name === 'messages') {
    // L'autore del messaggio viene confrontato con l'utente autenticato.
    const authorId = Number(existing.authorId);
    if (authorId !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Puoi modificare solo i tuoi messaggi' });
    }
  }

  if (resource.name === 'friendships') {
    // Entrambi gli estremi della friendship vengono convertiti in numero.
    const requester = Number(existing.requester);
    const recipient = Number(existing.recipient);
    if (![requester, recipient].includes(Number(req.user.id))) {
      return res.status(403).json({ error: 'Solo i partecipanti possono modificare questa amicizia' });
    }
  }

  if (resource.name === 'direct-messages') {
    // I partecipanti della chat vengono normalizzati per il controllo accessi.
    const participants = ensureArray(existing.participants).map(Number);
    if (!participants.includes(Number(req.user.id))) {
      return res.status(403).json({ error: 'Solo i partecipanti possono modificare questa chat privata' });
    }
  }

  // Costruisce il payload finale dell'update secondo i campi ammessi.
  const payload = normalizePayload(resource, req.body);

  if (resource.name === 'users' && payload.password) {
    // Re-hash della password solo quando e' presente nel body di update.
    payload.password = await hashPassword(req.body.password);
  }

  if (!Object.keys(payload).length) {
    return res.status(400).json({ error: 'Nessun campo aggiornabile inviato nel body' });
  }

  // Costruisce la query di update con i campi effettivamente presenti.
  const { sql, params } = buildUpdateStatement(resource, payload, req.params.id);
  // Esegue l'aggiornamento nel database.
  await execute(sql, params);
  // Rilegge il record aggiornato dal DB.
  const row = await fetchActiveRecordById(resource, req.params.id);

  return res.json(normalizeRecord(resource, row));
};

// Soft delete condiviso: il record non viene rimosso fisicamente, ma marcato con deletedAt.
const deleteHandler = async (resource, req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticazione richiesta' });
  }

  // Recupera il record da eliminare per poter applicare i controlli di autorizzazione.
  const existingRow = await fetchActiveRecordById(resource, req.params.id);

  if (!existingRow) {
    return res.status(404).json({ error: `${resource.name} non trovato` });
  }

  // Normalizza il record esistente per semplificare i controlli successivi.
  const existing = normalizeRecord(resource, existingRow);

  if (resource.name === 'users' && Number(req.user.id) !== Number(req.params.id)) {
    return res.status(403).json({ error: 'Puoi eliminare solo il tuo utente' });
  }

  if (resource.name === 'communities') {
    const { allowed } = await canManageCommunity(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: 'Solo l\'admin della community può eliminarla' });
    }
  }

  if (resource.name === 'friendships') {
    const requester = Number(existing.requester);
    const recipient = Number(existing.recipient);
    if (![requester, recipient].includes(Number(req.user.id))) {
      return res.status(403).json({ error: 'Solo i partecipanti possono eliminare questa amicizia' });
    }
  }

  // Esegue il soft delete impostando deletedAt alla data corrente.
  const [result] = await execute(
    `
      UPDATE ${resource.tableName}
      SET deletedAt = CURRENT_TIMESTAMP
      WHERE ${resource.primaryKey} = ?
        AND deletedAt IS NULL
    `,
    [req.params.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ error: `${resource.name} non trovato` });
  }

  // 204 indica successo senza payload di risposta.
  return res.status(204).send();
};

const registerDoc = {
  method: 'POST',
  path: '/api/auth/register',
  summary: 'Crea un utente e restituisce subito un JWT identificativo',
  body: {
    email: 'Email utente',
    password: 'Password in chiaro che verrà hashata',
    username: 'Username univoco',
  },
};

const loginDoc = {
  method: 'POST',
  path: '/api/auth/login',
  summary: 'Autentica un utente e restituisce un JWT',
  body: {
    email: 'Email registrata',
    password: 'Password in chiaro',
  },
};

const meDoc = {
  method: 'GET',
  path: '/api/auth/me',
  summary: 'Restituisce l\'utente autenticato associato al JWT',
  auth: 'Bearer token richiesto',
};

const communityPermissionsDoc = {
  method: 'GET',
  path: '/api/v1/communities/:id/permissions/me',
  summary: 'Restituisce i permessi dell\'utente autenticato nella community',
  auth: 'Bearer token richiesto',
};

const kickMemberDoc = {
  method: 'POST',
  path: '/api/v1/communities/:id/members/:memberId/kick',
  summary: 'Espelle un membro da una community se il richiedente è admin o ha permesso kick',
  auth: 'Bearer token richiesto',
};

const endpointDocs = resources.flatMap((resource) => [
  {
    method: 'GET',
    path: `/api/v1/${resource.name}`,
    summary: `Elenca le risorse di tipo ${resource.name}`,
    query: {
      limit: 'Numero massimo di record restituiti (default 50, max 100)',
      offset: 'Indice iniziale per la paginazione (default 0)',
    },
  },
  {
    method: 'GET',
    path: `/api/v1/${resource.name}/:id`,
    summary: `Recupera una risorsa ${resource.name} per ID`,
  },
  {
    method: 'POST',
    path: `/api/v1/${resource.name}`,
    summary: resource.name === 'users'
      ? 'Crea un utente e restituisce anche un JWT'
      : `Crea una nuova risorsa ${resource.name}`,
    requiredFields: resource.requiredFields,
    auth: requireAuthForMutation(resource.name) ? 'Bearer token richiesto' : 'Pubblico',
  },
  {
    method: 'PUT',
    path: `/api/v1/${resource.name}/:id`,
    summary: `Aggiorna una risorsa ${resource.name} esistente`,
    writableFields: resource.writableFields,
    auth: 'Bearer token richiesto',
  },
  {
    method: 'DELETE',
    path: `/api/v1/${resource.name}/:id`,
    summary: `Esegue soft delete della risorsa ${resource.name}`,
    auth: 'Bearer token richiesto',
  },
]);

// Definisce l'endpoint pubblico di registrazione.
router.post('/auth/register', async (req, res, next) => {
  try {
    // Delega tutta la logica di registrazione all'handler dedicato.
    await createUserHandler(req, res);
  } catch (error) {
    // Propaga l'errore al middleware globale di gestione errori.
    next(error);
  }
});

// Definisce l'endpoint pubblico di login con verifica password hashata.
router.post('/auth/login', async (req, res, next) => {
  try {
    // Estrae le credenziali dal body della richiesta.
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatorie' });
    }

    // Cerca l'utente attivo associato all'email normalizzata in minuscolo.
    const [rows] = await execute(
      `
        SELECT *
        FROM users
        WHERE email = ?
          AND deletedAt IS NULL
        LIMIT 1
      `,
      [email.toLowerCase()]
    );

    // Prende il primo utente trovato, se esiste.
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Verifica che la password in chiaro coincida con quella hashata in archivio.
    const passwordMatches = await comparePassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Sanitizza l'utente prima di restituirlo al client.
    const sanitizedUser = sanitizeUserResponse(user);
    // Firma un token JWT per la sessione del client.
    const token = signUserToken(sanitizedUser);

    return res.json({ user: sanitizedUser, token });
  } catch (error) {
    // Propaga gli errori imprevisti al middleware globale.
    next(error);
  }
});

// Restituisce il profilo associato al JWT inviato nel bearer token.
router.get('/auth/me', authenticateToken, async (req, res) => {
  // Il middleware authenticateToken ha gia' validato il token e popolato req.user.
  res.json({ user: sanitizeUser(req.user) });
});

// Documentazione runtime esposta come JSON per facilitare test manuali e integrazione frontend.
router.get('/docs', (req, res) => {
  // Risponde con una documentazione JSON minima ma leggibile dal frontend o da tool esterni.
  res.json({
    title: 'iAnime Data API',
    version: '1.1.0',
    description: 'API REST che media tra backend Express e database MySQL con autenticazione JWT e controllo permessi.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/health',
        summary: 'Controllo rapido dello stato del server API',
      },
      {
        method: 'GET',
        path: '/api/docs',
        summary: 'Restituisce la documentazione JSON di tutti gli endpoint',
      },
      registerDoc,
      loginDoc,
      meDoc,
      communityPermissionsDoc,
      kickMemberDoc,
      ...endpointDocs,
      {
        method: 'GET',
        path: '/api/justwatch',
        summary: 'Recupera le piattaforme streaming per titolo e paese',
        query: {
          title: 'Titolo anime da cercare',
          country: 'Codice paese opzionale, se omesso viene tentata la geolocalizzazione IP',
        },
      },
    ],
  });
});

// Espone i permessi effettivi dell'utente corrente in una specifica community.
router.get('/v1/communities/:id/permissions/me', authenticateToken, async (req, res, next) => {
  try {
    // Calcola community, stato admin e permessi dell'utente autenticato.
    const { community, isAdmin, permissions } = await getCommunityPermissionsForUser(req.params.id, req.user.id);

    if (!community) {
      return res.status(404).json({ error: 'community non trovata' });
    }

    // Restituisce anche capability booleane per semplificare il consumo lato frontend.
    return res.json({
      communityId: Number(req.params.id),
      userId: Number(req.user.id),
      isAdmin,
      permissions,
      capabilities: {
        kick: isAdmin || permissions.includes('kick'),
        deleteMsg: isAdmin || permissions.includes('deleteMsg'),
        mute: isAdmin || permissions.includes('mute'),
        manageRoles: isAdmin || permissions.includes('manageRoles'),
        manageChannels: isAdmin || permissions.includes('manageChannels'),
        manageCategories: isAdmin || permissions.includes('manageCategories'),
        pinMessages: isAdmin || permissions.includes('pinMessages'),
      },
    });
  } catch (error) {
    // Propaga eventuali errori al middleware globale.
    next(error);
  }
});

// Rimuove un membro dalla community e pulisce anche le appartenenze ai ruoli e all'utente.
router.post('/v1/communities/:id/members/:memberId/kick', authenticateToken, async (req, res, next) => {
  try {
    // Converte in numero l'id del membro da espellere.
    const targetMemberId = Number(req.params.memberId);
    // Converte in numero l'id dell'utente che esegue l'azione.
    const actorId = Number(req.user.id);
    // Recupera community e permessi dell'attore sulla community corrente.
    const { community, isAdmin, permissions } = await getCommunityPermissionsForUser(req.params.id, actorId);

    if (!community) {
      return res.status(404).json({ error: 'community non trovata' });
    }

    // Solo admin o ruoli con permesso kick possono espellere membri.
    if (!isAdmin && !permissions.includes('kick')) {
      return res.status(403).json({ error: 'Permessi insufficienti per espellere membri' });
    }

    if (Number(community.adminId) === targetMemberId) {
      return res.status(403).json({ error: 'Non puoi espellere l\'admin della community' });
    }

    // Carica la membership corrente della community come array di numeri.
    const currentMembers = ensureArray(community.members).map(Number);
    if (!currentMembers.includes(targetMemberId)) {
      return res.status(404).json({ error: 'Membro non presente nella community' });
    }

    // Rimuove il membro target dalla lista principale dei membri.
    const updatedMembers = currentMembers.filter((memberId) => memberId !== targetMemberId);
    await execute(
      `
        UPDATE communities
        SET members = ?
        WHERE id = ?
          AND deletedAt IS NULL
      `,
      [JSON.stringify(updatedMembers), req.params.id]
    );

    // Allinea anche i ruoli della community rimuovendo il membro espulso.
    const roles = await getRolesByIds(community.roles);
    for (const role of roles) {
      // Filtra il membro espulso dalla lista membri del ruolo corrente.
      const updatedRoleMembers = ensureArray(role.members).map(Number).filter((memberId) => memberId !== targetMemberId);
      await execute(
        `
          UPDATE roles
          SET members = ?
          WHERE id = ?
            AND deletedAt IS NULL
        `,
        [JSON.stringify(updatedRoleMembers), role.id]
      );
    }

    // Allinea infine il profilo utente del membro rimosso, se ancora presente.
    const targetUser = await getActiveUserById(targetMemberId);
    if (targetUser) {
      // Normalizza l'utente per poter leggere communities come array.
      const normalizedUser = normalizeRecord(resourceMap.users, targetUser);
      // Rimuove la community espellente dalla lista communities dell'utente.
      const updatedCommunities = ensureArray(normalizedUser.communities).map(Number).filter((communityId) => communityId !== Number(req.params.id));
      await execute(
        `
          UPDATE users
          SET communities = ?
          WHERE id = ?
            AND deletedAt IS NULL
        `,
        [JSON.stringify(updatedCommunities), targetMemberId]
      );
    }

    // Rilegge la community aggiornata per restituire lo stato corrente.
    const updatedCommunity = await getCommunityById(req.params.id);
    return res.json({
      message: 'Membro espulso correttamente',
      community: updatedCommunity,
    });
  } catch (error) {
    // Propaga gli errori al middleware globale.
    next(error);
  }
});

// Endpoint specialistici per la gestione dei membri nelle community.

// Recupera i profili minimali dei membri attivi di una community.
router.get('/v1/communities/:id/members', authenticateToken, async (req, res, next) => {
  try {
    // Recupera l'id della community dai parametri della rotta.
    const communityId = req.params.id;
    // Legge la community dal database in forma normalizzata.
    const community = await getCommunityById(communityId);

    if (!community) {
      return res.status(404).json({ error: 'Community non trovata' });
    }

    // Ottiene la lista dei membri della community.
    const members = ensureArray(community.members);
    const [rows] = await execute(
      `
        SELECT id, username, profileImage
        FROM users
        WHERE id IN (?)
          AND deletedAt IS NULL
      `,
      [members]
    );

    // Restituisce solo i dati profilo minimi dei membri attivi.
    res.json({ members: rows });
  } catch (error) {
    // Propaga gli errori al middleware globale.
    next(error);
  }
});

// Aggiunge un membro alla lista dei membri della community.
router.post('/v1/communities/:id/members', authenticateToken, async (req, res, next) => {
  try {
    // Recupera l'id della community dai parametri della rotta.
    const communityId = req.params.id;
    // Estrae dal body l'id dell'utente da aggiungere.
    const { userId } = req.body;

    // Verifica se l'utente autenticato puo' amministrare la community.
    const { community, allowed } = await canManageCommunity(communityId, req.user.id);

    if (!allowed) {
      return res.status(403).json({ error: 'Permessi insufficienti per aggiungere membri' });
    }

    // Carica l'attuale lista dei membri.
    const members = ensureArray(community.members);
    if (members.includes(userId)) {
      return res.status(400).json({ error: 'Utente già membro della community' });
    }

    // Inserisce il nuovo membro in coda alla lista.
    members.push(userId);
    await execute(
      `
        UPDATE communities
        SET members = ?
        WHERE id = ?
          AND deletedAt IS NULL
      `,
      [JSON.stringify(members), communityId]
    );

    // Risponde con conferma dell'aggiunta.
    res.status(201).json({ message: 'Membro aggiunto con successo' });
  } catch (error) {
    // Propaga gli errori al middleware globale.
    next(error);
  }
});

// Rimuove un membro dalla community senza cancellare il relativo utente.
router.delete('/v1/communities/:id/members/:memberId', authenticateToken, async (req, res, next) => {
  try {
    // Recupera l'id della community e del membro da rimuovere.
    const communityId = req.params.id;
    const memberId = Number(req.params.memberId);

    // Verifica i permessi amministrativi dell'utente autenticato.
    const { community, allowed } = await canManageCommunity(communityId, req.user.id);

    if (!allowed) {
      return res.status(403).json({ error: 'Permessi insufficienti per rimuovere membri' });
    }

    // Ricostruisce la lista membri escludendo il membro target.
    const members = ensureArray(community.members).filter((id) => id !== memberId);
    await execute(
      `
        UPDATE communities
        SET members = ?
        WHERE id = ?
          AND deletedAt IS NULL
      `,
      [JSON.stringify(members), communityId]
    );

    // Risponde con conferma della rimozione.
    res.status(200).json({ message: 'Membro rimosso con successo' });
  } catch (error) {
    // Propaga gli errori al middleware globale.
    next(error);
  }
});

// Genera automaticamente le rotte CRUD per ogni risorsa descritta nei metadati.
for (const resource of resources) {
  router.get(`/v1/${resource.name}`, async (req, res, next) => {
    try {
      // Usa l'handler generico di listing per la risorsa corrente.
      await listHandler(resource, req, res);
    } catch (error) {
      // Propaga gli errori al middleware globale.
      next(error);
    }
  });

  router.get(`/v1/${resource.name}/:id`, async (req, res, next) => {
    try {
      // Usa l'handler generico di dettaglio per la risorsa corrente.
      await getByIdHandler(resource, req, res);
    } catch (error) {
      // Propaga gli errori al middleware globale.
      next(error);
    }
  });

  router.post(
    `/v1/${resource.name}`,
    requireAuthForMutation(resource.name) ? authenticateToken : (req, res, next) => next(),
    async (req, res, next) => {
      try {
        // Usa l'handler generico di creazione per la risorsa corrente.
        await createHandler(resource, req, res);
      } catch (error) {
        // Propaga gli errori al middleware globale.
        next(error);
      }
    }
  );

  router.put(`/v1/${resource.name}/:id`, authenticateToken, async (req, res, next) => {
    try {
      // Usa l'handler generico di aggiornamento per la risorsa corrente.
      await updateHandler(resource, req, res);
    } catch (error) {
      // Propaga gli errori al middleware globale.
      next(error);
    }
  });

  router.delete(`/v1/${resource.name}/:id`, authenticateToken, async (req, res, next) => {
    try {
      // Usa l'handler generico di soft delete per la risorsa corrente.
      await deleteHandler(resource, req, res);
    } catch (error) {
      // Propaga gli errori al middleware globale.
      next(error);
    }
  });
}

module.exports = {
  dataApiRouter: router,
  endpointDocs: [registerDoc, loginDoc, meDoc, communityPermissionsDoc, kickMemberDoc, ...endpointDocs],
};
