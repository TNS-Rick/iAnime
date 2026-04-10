// server/middleware/tenantContextMiddleware.js

const TenantContext = require('../context/TenantContext');

/**
 * Middleware che estrae il TenantContext dal JWT token e lo aggiunge a req
 * 
 * Uso:
 *   app.use('/api/protected', tenantContextMiddleware, routeHandler);
 * 
 * Dopo l'esecuzione:
 *   - req.tenantContext conterrà l'istanza di TenantContext
 *   - res.locals.tenantId conterrà l'ID del tenant per i template (se usati)
 */
async function tenantContextMiddleware(req, res, next) {
  try {
    // Estrai token dal header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Autorizzazione richiesta',
        message: 'Header Authorization con Bearer token non fornito',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Crea TenantContext dal token
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const tenantContext = await TenantContext.fromJWT(token, jwtSecret);

    // Aggiungi al request
    req.tenantContext = tenantContext;

    // Aggiungi a res.locals per template/logging
    res.locals.tenantId = tenantContext.tenantId;
    res.locals.userId = tenantContext.userId;

    // Log per debugging
    console.log(
      `[TenantContext] Tenant: ${tenantContext.tenantId}, User: ${tenantContext.userId}`
    );

    next();
  } catch (error) {
    console.error('[TenantContext Error]', error.message);

    return res.status(401).json({
      error: 'Autorizzazione fallita',
      message: error.message,
    });
  }
}

/**
 * Middleware opzionale per validare che il tenantId nel path
 * corrisponda al tenantId nel token
 */
function validateTenantPathParam(req, res, next) {
  try {
    const { tenantId } = req.params;
    const contextTenantId = req.tenantContext?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        error: 'tenantId parametro mancante',
      });
    }

    if (String(tenantId) !== String(contextTenantId)) {
      return res.status(403).json({
        error: 'Accesso negato',
        message:
          'Non hai permessi per accedere a questo tenant',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      error: 'Errore di validazione',
      message: error.message,
    });
  }
}

module.exports = {
  tenantContextMiddleware,
  validateTenantPathParam,
};
