const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { connectDB } = require('./db/connection');
const { initializeDatabase } = require('./db/seed');
const { authEndpointsRouter } = require('./api/authEndpoints');
const { communityEndpointsRouter } = require('./api/communityEndpointsV2');
const { testEndpointsRouter } = require('./api/testEndpoints');
const { Message, User, DirectMessage } = require('./models');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

// Store connected users
const connectedUsers = new Map();

console.log('🚀 Inizializzazione database...\n');
async function startServer() {
  try {
    await initializeDatabase();
    console.log('✅ Database pronto\n');

    // Expose Socket.io instance to route handlers.
    app.set('io', io);

    // Connect to MySQL
    connectDB();

    // ===== REGISTRA LE ROUTE =====
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'iAnime API',
        timestamp: new Date().toISOString(),
      });
    });

    app.use('/api', authEndpointsRouter);
    app.use('/api', communityEndpointsRouter);
    app.use('/api', testEndpointsRouter);
    // =============================

    // Cache for streaming platforms
    const geoCache = new Map();
    const jwCache = new Map();
    const CACHE_TTL = 1000 * 60 * 60; // 1 hour

    // API: JustWatch platforms
    app.get('/api/justwatch', async (req, res) => {
      const { title, country } = req.query;
      if (!title) return res.status(400).json({ error: 'Titolo richiesto' });

      try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const cacheKey = `${title.toLowerCase()}_${country || 'US'}`;
        const cachedJW = jwCache.get(cacheKey);

        if (cachedJW && Date.now() - cachedJW.timestamp < CACHE_TTL) {
          return res.json({ platforms: cachedJW.platforms, country: country || 'US' });
        }

        const url = `https://apis.justwatch.com/content/titles/${(country || 'US').toLowerCase()}/popular?query=${encodeURIComponent(title)}`;
        const jwRes = await fetch(url);
        const jwData = await jwRes.json();

        let platforms = [];
        if (jwData && jwData.items && jwData.items.length > 0) {
          const offers = jwData.items[0].offers || [];
          const providers = {};
          offers.forEach(offer => {
            if (!providers[offer.provider_id]) {
              providers[offer.provider_id] = {
                name: offer.provider_id,
                url: offer.urls?.standard_web,
                type: offer.monetization_type
              };
            }
          });
          platforms = Object.values(providers);
        }

        jwCache.set(cacheKey, { platforms, timestamp: Date.now() });
        res.json({ platforms, country: country || 'US' });
      } catch (error) {
        console.error('JustWatch API error:', error.message);
        res.json({ platforms: [], country: country || 'US', error: 'JustWatch API non disponibile' });
      }
    });

    // ===== SOCKET.IO REAL-TIME COMMUNICATION =====
    io.on('connection', (socket) => {
      console.log(`✅ Nuovo utente connesso: ${socket.id}`);

      // User joins (stores user info)
      socket.on('user-join', async (data) => {
        try {
          const { userId } = data;
          connectedUsers.set(socket.id, { userId, socketId: socket.id });
          console.log(`👤 Utente ${userId} è online (socket: ${socket.id})`);

          // Notify all users
          io.emit('user-online', { userId, socketId: socket.id, onlineUsers: Array.from(connectedUsers.values()) });
        } catch (error) {
          console.error('Error in user-join:', error);
        }
      });

      // Channel message
      socket.on('send-message', async (data) => {
        try {
          const { content, channelId, userId } = data;

          // Save message to database
          const message = await Message.create({
            content,
            authorId: userId,
            channelId,
            mentions: [],
            reactions: [],
          });

          // Get user info
          const user = await User.findById(userId);
          const messageData = {
            ...message,
            author: user ? { id: user.id, username: user.username } : null,
          };

          // Broadcast only to channel room to avoid cross-channel leaks and duplicates.
          io.to(`channel-${channelId}`).emit(`channel-${channelId}`, { type: 'message', message: messageData });
          console.log(`📝 Messaggio in canale ${channelId}: ${content.substring(0, 50)}...`);
        } catch (error) {
          console.error('Error in send-message:', error);
          socket.emit('error', { message: 'Errore nell\'invio del messaggio' });
        }
      });

      // Direct message
      socket.on('send-dm', async (data) => {
        try {
          const { content, recipientId, senderId } = data;

          // Find or create DM session
          let dmSession = await DirectMessage.findByParticipants(senderId, recipientId);
          if (!dmSession) {
            dmSession = await DirectMessage.create({
              participants: [senderId, recipientId],
              messages: [],
            });
          }

          // Create message
          const message = await Message.create({
            content,
            authorId: senderId,
            dmSessionId: dmSession.id,
          });

          // Get sender info
          const sender = await User.findById(senderId);
          const messageData = {
            ...message,
            author: sender ? { id: sender.id, username: sender.username } : null,
          };

          // Send to specific recipient
          const recipientSocket = Array.from(connectedUsers.entries())
            .find(([_, user]) => user.userId === recipientId);

          if (recipientSocket) {
            io.to(recipientSocket[0]).emit('receive-dm', {
              dmSessionId: dmSession.id,
              message: messageData,
            });
          }

          // Confirm to sender
          socket.emit('dm-sent', { message: messageData, dmSessionId: dmSession.id });
          console.log(`💬 DM inviato a ${recipientId}`);
        } catch (error) {
          console.error('Error in send-dm:', error);
          socket.emit('error', { message: 'Errore nell\'invio del messaggio privato' });
        }
      });

      // User typing
      socket.on('user-typing', (data) => {
        const { channelId, userId, isTyping } = data;
        io.emit(`typing-${channelId}`, { userId, isTyping });
      });

      // Join channel
      socket.on('join-channel', (data) => {
        const { channelId } = data;
        socket.join(`channel-${channelId}`);
        console.log(`🎤 Utente entrato in canale: ${channelId}`);
      });

      // Leave channel
      socket.on('leave-channel', (data) => {
        const { channelId } = data;
        socket.leave(`channel-${channelId}`);
        console.log(`🚪 Utente uscito dal canale: ${channelId}`);
      });

      // Disconnect
      socket.on('disconnect', () => {
        const userInfo = connectedUsers.get(socket.id);
        if (userInfo) {
          connectedUsers.delete(socket.id);
          console.log(`❌ Utente ${userInfo.userId} offline`);
          io.emit('user-offline', { userId: userInfo.userId, socketId: socket.id });
        }
      });

      // Error handling
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });

    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🎤 iAnime Server running su http://localhost:${PORT}`);
      console.log(`🌐 Socket.io ready per chat real-time`);
    });
  } catch (error) {
    console.error('❌ Errore durante startup:', error);
    process.exit(1);
  }
}

startServer();
