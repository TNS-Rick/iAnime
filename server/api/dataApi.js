const express = require('express');
const {
  authenticateToken,
  comparePassword,
  getActiveUserById,
  hashPassword,
  sanitizeUser,
  signUserToken,
} = require('./auth');
const { execute } = require('../db/connection');
const { resources, resourceMap } = require('./resources');

const router = express.Router();

const ALL_COMMUNITY_PERMISSIONS = [
  'kick',
  'deleteMsg',
  'mute',
  'manageRoles',
  'manageChannels',
  'manageCategories',
  'pinMessages',
];

const parseJsonValue = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const ensureArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
};

const normalizeRecord = (resource, record) => {
  const normalized = { ...record };

  for (const field of resource.jsonFields) {
    if (field in normalized) {
      normalized[field] = parseJsonValue(normalized[field]);
    }
  }

  for (const field of resource.booleanFields) {
    if (field in normalized && normalized[field] !== null) {
      normalized[field] = Boolean(normalized[field]);
    }
  }

  for (const field of resource.sensitiveFields || []) {
    delete normalized[field];
  }

  return normalized;
};

const normalizePayload = (resource, payload = {}) => {
  const cleanPayload = {};

  for (const field of resource.writableFields) {
    if (payload[field] === undefined) {
      continue;
    }

    cleanPayload[field] = resource.jsonFields.includes(field)
      ? JSON.stringify(payload[field])
      : payload[field];
  }

  return cleanPayload;
};

const validateRequiredFields = (resource, payload) => {
  return resource.requiredFields.filter((field) => payload[field] === undefined || payload[field] === null);
};

const buildInsertStatement = (resource, payload) => {
  const fields = Object.keys(payload);
  const placeholders = fields.map(() => '?').join(', ');
  const sql = `
    INSERT INTO ${resource.tableName}
      (${fields.join(', ')})
    VALUES
      (${placeholders})
  `;
  const params = fields.map((field) => payload[field]);

  return { sql, params };
};

const buildUpdateStatement = (resource, payload, id) => {
  const fields = Object.keys(payload);
  const assignments = fields.map((field) => `${field} = ?`).join(', ');
  const sql = `
    UPDATE ${resource.tableName}
    SET ${assignments}
    WHERE ${resource.primaryKey} = ?
      AND deletedAt IS NULL
  `;
  const params = [...fields.map((field) => payload[field]), id];

  return { sql, params };
};

const fetchActiveRecordById = async (resource, id) => {
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

  return rows[0] || null;
};

const getCommunityById = async (communityId) => {
  const community = await fetchActiveRecordById(resourceMap.communities, communityId);
  return community ? normalizeRecord(resourceMap.communities, community) : null;
};

const getRolesByIds = async (roleIds) => {
  const ids = ensureArray(roleIds).map(Number).filter(Boolean);

  if (!ids.length) {
    return [];
  }

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
  return rows.map((row) => normalizeRecord(resourceMap.roles, row));
};

const getCommunityPermissionsForUser = async (communityId, userId) => {
  const community = await getCommunityById(communityId);

  if (!community) {
    return { community: null, isAdmin: false, permissions: [] };
  }

  if (Number(community.adminId) === Number(userId)) {
    return { community, isAdmin: true, permissions: [...ALL_COMMUNITY_PERMISSIONS] };
  }

  const roles = await getRolesByIds(community.roles);
  const permissions = new Set();

  for (const role of roles) {
    const members = ensureArray(role.members).map(Number);
    if (members.includes(Number(userId))) {
      for (const permission of ensureArray(role.permissions)) {
        permissions.add(permission);
      }
    }
  }

  return { community, isAdmin: false, permissions: [...permissions] };
};

const requireAuthForMutation = (resourceName) => resourceName !== 'users';

const canManageCommunity = async (communityId, userId) => {
  const { community, isAdmin } = await getCommunityPermissionsForUser(communityId, userId);
  return { community, allowed: isAdmin };
};

const sanitizeUserResponse = (user) => sanitizeUser(normalizeRecord(resourceMap.users, user));

const applyUserDefaults = (payload) => ({
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
  ...payload,
});

const listHandler = async (resource, req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
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

  const items = rows.map((row) => normalizeRecord(resource, row));
  res.json({ resource: resource.name, count: items.length, items });
};

const getByIdHandler = async (resource, req, res) => {
  const row = await fetchActiveRecordById(resource, req.params.id);

  if (!row) {
    return res.status(404).json({ error: `${resource.name} non trovato` });
  }

  return res.json(normalizeRecord(resource, row));
};

const createUserHandler = async (req, res) => {
  const resource = resourceMap.users;
  const mergedPayload = applyUserDefaults(req.body);
  const payload = normalizePayload(resource, mergedPayload);
  const missingFields = validateRequiredFields(resource, payload);

  if (missingFields.length) {
    return res.status(400).json({ error: 'Campi obbligatori mancanti', missingFields });
  }

  payload.password = await hashPassword(req.body.password);

  const { sql, params } = buildInsertStatement(resource, payload);
  const [result] = await execute(sql, params);
  const createdUser = await getActiveUserById(result.insertId);
  const sanitizedUser = sanitizeUserResponse(createdUser);
  const token = signUserToken(sanitizedUser);

  return res.status(201).json({ user: sanitizedUser, token });
};

const createHandler = async (resource, req, res) => {
  if (resource.name === 'users') {
    return createUserHandler(req, res);
  }

  if (requireAuthForMutation(resource.name) && !req.user) {
    return res.status(401).json({ error: 'Autenticazione richiesta' });
  }

  if (resource.name === 'communities') {
    req.body.adminId = req.user.id;
  }

  if (resource.name === 'messages') {
    req.body.authorId = req.user.id;
  }

  if (resource.name === 'friendships') {
    req.body.requester = req.user.id;
  }

  if (resource.name === 'direct-messages') {
    const participants = ensureArray(req.body.participants).map(Number);
    if (!participants.includes(Number(req.user.id))) {
      return res.status(403).json({ error: 'Il creatore della chat deve essere tra i partecipanti' });
    }
  }

  const payload = normalizePayload(resource, req.body);
  const missingFields = validateRequiredFields(resource, payload);

  if (missingFields.length) {
    return res.status(400).json({ error: 'Campi obbligatori mancanti', missingFields });
  }

  const { sql, params } = buildInsertStatement(resource, payload);
  const [result] = await execute(sql, params);
  const row = await fetchActiveRecordById(resource, result.insertId);

  return res.status(201).json(normalizeRecord(resource, row));
};

const updateHandler = async (resource, req, res) => {
  if (requireAuthForMutation(resource.name) && !req.user) {
    return res.status(401).json({ error: 'Autenticazione richiesta' });
  }

  const existingRow = await fetchActiveRecordById(resource, req.params.id);

  if (!existingRow) {
    return res.status(404).json({ error: `${resource.name} non trovato` });
  }

  const existing = normalizeRecord(resource, existingRow);

  if (resource.name === 'users' && Number(req.user?.id) !== Number(req.params.id)) {
    return res.status(403).json({ error: 'Puoi modificare solo il tuo utente' });
  }

  if (resource.name === 'communities') {
    const { allowed } = await canManageCommunity(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: 'Solo l\'admin della community può modificarla' });
    }
    req.body.adminId = existing.adminId;
  }

  if (resource.name === 'messages') {
    const authorId = Number(existing.authorId);
    if (authorId !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Puoi modificare solo i tuoi messaggi' });
    }
  }

  if (resource.name === 'friendships') {
    const requester = Number(existing.requester);
    const recipient = Number(existing.recipient);
    if (![requester, recipient].includes(Number(req.user.id))) {
      return res.status(403).json({ error: 'Solo i partecipanti possono modificare questa amicizia' });
    }
  }

  if (resource.name === 'direct-messages') {
    const participants = ensureArray(existing.participants).map(Number);
    if (!participants.includes(Number(req.user.id))) {
      return res.status(403).json({ error: 'Solo i partecipanti possono modificare questa chat privata' });
    }
  }

  const payload = normalizePayload(resource, req.body);

  if (resource.name === 'users' && payload.password) {
    payload.password = await hashPassword(req.body.password);
  }

  if (!Object.keys(payload).length) {
    return res.status(400).json({ error: 'Nessun campo aggiornabile inviato nel body' });
  }

  const { sql, params } = buildUpdateStatement(resource, payload, req.params.id);
  await execute(sql, params);
  const row = await fetchActiveRecordById(resource, req.params.id);

  return res.json(normalizeRecord(resource, row));
};

const deleteHandler = async (resource, req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticazione richiesta' });
  }

  const existingRow = await fetchActiveRecordById(resource, req.params.id);

  if (!existingRow) {
    return res.status(404).json({ error: `${resource.name} non trovato` });
  }

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

  if (resource.name === 'messages' && Number(existing.authorId) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'Puoi eliminare solo i tuoi messaggi' });
  }

  if (resource.name === 'friendships') {
    const requester = Number(existing.requester);
    const recipient = Number(existing.recipient);
    if (![requester, recipient].includes(Number(req.user.id))) {
      return res.status(403).json({ error: 'Solo i partecipanti possono eliminare questa amicizia' });
    }
  }

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

router.post('/auth/register', async (req, res, next) => {
  try {
    await createUserHandler(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatorie' });
    }

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

    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const passwordMatches = await comparePassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const sanitizedUser = sanitizeUserResponse(user);
    const token = signUserToken(sanitizedUser);

    return res.json({ user: sanitizedUser, token });
  } catch (error) {
    next(error);
  }
});

router.get('/auth/me', authenticateToken, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

router.get('/docs', (req, res) => {
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

router.get('/v1/communities/:id/permissions/me', authenticateToken, async (req, res, next) => {
  try {
    const { community, isAdmin, permissions } = await getCommunityPermissionsForUser(req.params.id, req.user.id);

    if (!community) {
      return res.status(404).json({ error: 'community non trovata' });
    }

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
    next(error);
  }
});

router.post('/v1/communities/:id/members/:memberId/kick', authenticateToken, async (req, res, next) => {
  try {
    const targetMemberId = Number(req.params.memberId);
    const actorId = Number(req.user.id);
    const { community, isAdmin, permissions } = await getCommunityPermissionsForUser(req.params.id, actorId);

    if (!community) {
      return res.status(404).json({ error: 'community non trovata' });
    }

    if (!isAdmin && !permissions.includes('kick')) {
      return res.status(403).json({ error: 'Permessi insufficienti per espellere membri' });
    }

    if (Number(community.adminId) === targetMemberId) {
      return res.status(403).json({ error: 'Non puoi espellere l\'admin della community' });
    }

    const currentMembers = ensureArray(community.members).map(Number);
    if (!currentMembers.includes(targetMemberId)) {
      return res.status(404).json({ error: 'Membro non presente nella community' });
    }

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

    const roles = await getRolesByIds(community.roles);
    for (const role of roles) {
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

    const targetUser = await getActiveUserById(targetMemberId);
    if (targetUser) {
      const normalizedUser = normalizeRecord(resourceMap.users, targetUser);
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

    const updatedCommunity = await getCommunityById(req.params.id);
    return res.json({
      message: 'Membro espulso correttamente',
      community: updatedCommunity,
    });
  } catch (error) {
    next(error);
  }
});

// Aggiunta di endpoint per la gestione delle community

// Recupera tutti i membri di una community
router.get('/v1/communities/:id/members', authenticateToken, async (req, res, next) => {
  try {
    const communityId = req.params.id;
    const community = await getCommunityById(communityId);

    if (!community) {
      return res.status(404).json({ error: 'Community non trovata' });
    }

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

    res.json({ members: rows });
  } catch (error) {
    next(error);
  }
});

// Aggiungi un membro a una community
router.post('/v1/communities/:id/members', authenticateToken, async (req, res, next) => {
  try {
    const communityId = req.params.id;
    const { userId } = req.body;

    const { community, allowed } = await canManageCommunity(communityId, req.user.id);

    if (!allowed) {
      return res.status(403).json({ error: 'Permessi insufficienti per aggiungere membri' });
    }

    const members = ensureArray(community.members);
    if (members.includes(userId)) {
      return res.status(400).json({ error: 'Utente già membro della community' });
    }

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

    res.status(201).json({ message: 'Membro aggiunto con successo' });
  } catch (error) {
    next(error);
  }
});

// Rimuovi un membro da una community
router.delete('/v1/communities/:id/members/:memberId', authenticateToken, async (req, res, next) => {
  try {
    const communityId = req.params.id;
    const memberId = Number(req.params.memberId);

    const { community, allowed } = await canManageCommunity(communityId, req.user.id);

    if (!allowed) {
      return res.status(403).json({ error: 'Permessi insufficienti per rimuovere membri' });
    }

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

    res.status(200).json({ message: 'Membro rimosso con successo' });
  } catch (error) {
    next(error);
  }
});

for (const resource of resources) {
  router.get(`/v1/${resource.name}`, async (req, res, next) => {
    try {
      await listHandler(resource, req, res);
    } catch (error) {
      next(error);
    }
  });

  router.get(`/v1/${resource.name}/:id`, async (req, res, next) => {
    try {
      await getByIdHandler(resource, req, res);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    `/v1/${resource.name}`,
    requireAuthForMutation(resource.name) ? authenticateToken : (req, res, next) => next(),
    async (req, res, next) => {
      try {
        await createHandler(resource, req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  router.put(`/v1/${resource.name}/:id`, authenticateToken, async (req, res, next) => {
    try {
      await updateHandler(resource, req, res);
    } catch (error) {
      next(error);
    }
  });

  router.delete(`/v1/${resource.name}/:id`, authenticateToken, async (req, res, next) => {
    try {
      await deleteHandler(resource, req, res);
    } catch (error) {
      next(error);
    }
  });
}

module.exports = {
  dataApiRouter: router,
  endpointDocs: [registerDoc, loginDoc, meDoc, communityPermissionsDoc, kickMemberDoc, ...endpointDocs],
};
