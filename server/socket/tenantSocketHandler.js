// server/socket/tenantSocketHandler.js - Multi-Tenant Socket.io

const TenantContext = require('../context/TenantContext');

/**
 * Configura Socket.io per supportare multi-tenancy
 * 
 * Isolamento per tenant tramite namespace e room
 */
function setupTenantSockets(io) {
  // Mappa di utenti connessi per tenant
  const tenantUsers = new Map();

  /**
   * Ottieni gli utenti connessi per un tenant
   */
  function getTenantUsers(tenantId) {
    if (!tenantUsers.has(tenantId)) {
      tenantUsers.set(tenantId, new Set());
    }
    return tenantUsers.get(tenantId);
  }

  /**
   * Gestisci la connessione di un nuovo client
   */
  io.on('connection', (socket) => {
    console.log(`✅ Socket connesso: ${socket.id}`);

    let tenantContext = null;

    /**
     * Event: authenticate
     * Client invia il token per autenticarsi
     */
    socket.on('authenticate', async (data) => {
      try {
        const { token } = data;

        if (!token) {
          socket.emit('auth-error', { message: 'Token mancante' });
          return;
        }

        // Crea TenantContext dal token
        const jwtSecret = process.env.JWT_SECRET || 'secret';
        tenantContext = await TenantContext.fromJWT(token, jwtSecret);

        // Registra il socket in una room per il tenant
        const tenantRoom = `tenant:${tenantContext.tenantId}`;
        socket.join(tenantRoom);

        // Aggiungi l'utente alle liste di utenti connessi
        const connectedUsers = getTenantUsers(tenantContext.tenantId);
        connectedUsers.add(tenantContext.userId);

        console.log(
          `✅ Autenticato: Tenant=${tenantContext.tenantId}, User=${tenantContext.userId}`
        );

        // Notifica a tutti gli utenti del tenant che un utente è online
        io.to(tenantRoom).emit('user-online', {
          userId: tenantContext.userId,
          timestamp: new Date().toISOString(),
        });

        socket.emit('authenticated', {
          message: 'Autenticato con successo',
          tenantId: tenantContext.tenantId,
          userId: tenantContext.userId,
        });
      } catch (error) {
        console.error('[Socket Auth Error]', error.message);
        socket.emit('auth-error', { message: error.message });
      }
    });

    /**
     * Event: send-message
     * Utente invia un messaggio nel tenant
     */
    socket.on('send-message', async (data) => {
      try {
        if (!tenantContext) {
          socket.emit('error', { message: 'Non autenticato' });
          return;
        }

        const { channelId, content } = data;

        if (!channelId || !content) {
          socket.emit('error', { message: 'channelId e content obbligatori' });
          return;
        }

        const message = {
          id: `msg-${Date.now()}`,
          channelId,
          authorId: tenantContext.userId,
          content,
          timestamp: new Date().toISOString(),
          tenantId: tenantContext.tenantId,
        };

        // Emetti il messaggio SOLO ai client del tenant
        const tenantRoom = `tenant:${tenantContext.tenantId}`;
        io.to(tenantRoom).emit('receive-message', message);

        console.log(
          `💬 Messaggio: Tenant=${tenantContext.tenantId}, Channel=${channelId}, User=${tenantContext.userId}`
        );
      } catch (error) {
        console.error('[Send Message Error]', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Event: typing
     * Utente sta scrivendo
     */
    socket.on('typing', (data) => {
      try {
        if (!tenantContext) return;

        const { channelId } = data;
        const tenantRoom = `tenant:${tenantContext.tenantId}`;

        io.to(tenantRoom).emit('user-typing', {
          channelId,
          userId: tenantContext.userId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[Typing Error]', error);
      }
    });

    /**
     * Event: join-channel
     * Utente entra in un canale
     */
    socket.on('join-channel', async (data) => {
      try {
        if (!tenantContext) return;

        const { channelId } = data;
        const channelRoom = `channel:${tenantContext.tenantId}:${channelId}`;

        // Aggiungi socket al channel room
        socket.join(channelRoom);

        // Notifica che l'utente è entrato nel canale
        io.to(channelRoom).emit('user-joined-channel', {
          userId: tenantContext.userId,
          channelId,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `📍 Utente entrato: Tenant=${tenantContext.tenantId}, Channel=${channelId}`
        );
      } catch (error) {
        console.error('[Join Channel Error]', error);
      }
    });

    /**
     * Event: leave-channel
     * Utente esce da un canale
     */
    socket.on('leave-channel', (data) => {
      try {
        if (!tenantContext) return;

        const { channelId } = data;
        const channelRoom = `channel:${tenantContext.tenantId}:${channelId}`;

        socket.leave(channelRoom);

        io.to(channelRoom).emit('user-left-channel', {
          userId: tenantContext.userId,
          channelId,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `📍 Utente uscito: Tenant=${tenantContext.tenantId}, Channel=${channelId}`
        );
      } catch (error) {
        console.error('[Leave Channel Error]', error);
      }
    });

    /**
     * Event: disconnect
     * Client si disconnette
     */
    socket.on('disconnect', () => {
      try {
        if (tenantContext) {
          const tenantRoom = `tenant:${tenantContext.tenantId}`;
          const connectedUsers = getTenantUsers(tenantContext.tenantId);

          connectedUsers.delete(tenantContext.userId);

          // Notifica che l'utente è offline
          io.to(tenantRoom).emit('user-offline', {
            userId: tenantContext.userId,
            timestamp: new Date().toISOString(),
          });

          console.log(
            `❌ Disconnesso: Tenant=${tenantContext.tenantId}, User=${tenantContext.userId}`
          );
        }
      } catch (error) {
        console.error('[Disconnect Error]', error);
      }
    });

    /**
     * Event: error
     */
    socket.on('error', (error) => {
      console.error('[Socket Error]', error);
    });
  });

  return {
    getTenantUsers,
    getTenantConnectedCount: (tenantId) => getTenantUsers(tenantId).size,
  };
}

module.exports = { setupTenantSockets };
