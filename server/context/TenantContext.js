// server/context/TenantContext.js

const jwt = require('jsonwebtoken');

/**
 * Classe che rappresenta il contesto di un tenant specifico.
 * Ogni operazione deve essere eseguita all'interno di un TenantContext.
 */
class TenantContext {
  constructor(tenantId, userId, userEmail) {
    if (!tenantId) {
      throw new Error('tenantId è obbligatorio');
    }

    this.tenantId = tenantId;
    this.userId = userId;
    this.userEmail = userEmail;
    this.createdAt = new Date().toISOString();
  }

  /**
   * Crea un TenantContext da un JWT token
   */
  static async fromJWT(token, jwtSecret) {
    try {
      if (!token) {
        throw new Error('Token non fornito');
      }

      const decoded = jwt.verify(token, jwtSecret);

      if (!decoded.tenantId) {
        throw new Error('tenantId non trovato nel token');
      }

      return new TenantContext(
        decoded.tenantId,
        decoded.userId,
        decoded.email
      );
    } catch (error) {
      throw new Error(`Token non valido: ${error.message}`);
    }
  }

  /**
   * Genera un nuovo JWT con tenant context
   */
  static generateToken(userId, tenantId, email, jwtSecret, expiresIn = '24h') {
    return jwt.sign(
      {
        userId,
        tenantId,
        email,
      },
      jwtSecret,
      { expiresIn }
    );
  }

  /**
   * Verifica che l'utente abbia accesso a una risorsa in questo tenant
   */
  hasAccessToResource(resourceOwnerId) {
    return this.userId === resourceOwnerId;
  }

  /**
   * Serializza il contesto per logging/audit
   */
  toJSON() {
    return {
      tenantId: this.tenantId,
      userId: this.userId,
      userEmail: this.userEmail,
      createdAt: this.createdAt,
    };
  }
}

module.exports = TenantContext;
