// API Service for React frontend
// Handles all API calls and Socket.io connection

import io from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
let socket = null;
let authToken = null;

// ===== HTTP CLIENT =====

const apiCall = async (method, endpoint, body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
};

// ===== AUTHENTICATION =====

export const authService = {
  // Register new user
  register: (email, password, username) =>
    apiCall('POST', '/v1/auth/register', { email, password, username }),

  // Login
  login: (email, password) =>
    apiCall('POST', '/v1/auth/login', { email, password }),

  // Get current user
  getCurrentUser: () =>
    apiCall('GET', '/v1/auth/me'),

  // Update profile
  updateProfile: (updates) =>
    apiCall('PUT', '/v1/auth/profile', updates),

  // Change password
  changePassword: (currentPassword, newPassword) =>
    apiCall('POST', '/v1/auth/change-password', { currentPassword, newPassword }),

  // Logout
  logout: () =>
    apiCall('POST', '/v1/auth/logout'),

  // Store token
  setToken: (token) => {
    authToken = token;
    localStorage.setItem('auth_token', token);
  },

  // Get stored token
  getToken: () => {
    if (!authToken) {
      authToken = localStorage.getItem('auth_token');
    }
    return authToken;
  },

  // Clear token
  clearToken: () => {
    authToken = null;
    localStorage.removeItem('auth_token');
  },
};

// ===== COMMUNITIES =====

export const communityService = {
  // Get all communities
  getAll: (limit = 20, offset = 0) =>
    apiCall('GET', `/v1/communities?limit=${limit}&offset=${offset}`),

  // Get community by ID
  getById: (id) =>
    apiCall('GET', `/v1/communities/${id}`),

  // Create community
  create: (name, description = '') =>
    apiCall('POST', '/v1/communities', { name, description }),

  // Update community
  update: (id, name, description) =>
    apiCall('PUT', `/v1/communities/${id}`, { name, description }),

  // Delete community
  delete: (id) =>
    apiCall('DELETE', `/v1/communities/${id}`),

  // Get members
  getMembers: (id) =>
    apiCall('GET', `/v1/communities/${id}/members`),

  // Join community
  join: (id) =>
    apiCall('POST', `/v1/communities/${id}/join`),

  // Leave community
  leave: (id) =>
    apiCall('POST', `/v1/communities/${id}/leave`),
};

// ===== CHANNELS =====

export const channelService = {
  // Get all channels (in community)
  getAll: (communityId, limit = 10, offset = 0) =>
    apiCall('GET', `/v1/communities/${communityId}/channels?limit=${limit}&offset=${offset}`),

  // Get channel by ID
  getById: (id) =>
    apiCall('GET', `/v1/channels/${id}`),

  // Create channel
  create: (communityId, name, type = 'text') =>
    apiCall('POST', `/v1/communities/${communityId}/channels`, { name, type }),

  // Update channel
  update: (id, name, type) =>
    apiCall('PUT', `/v1/channels/${id}`, { name, type }),

  // Delete channel
  delete: (id) =>
    apiCall('DELETE', `/v1/channels/${id}`),

  // Get messages in channel
  getMessages: (id, limit = 50, offset = 0) =>
    apiCall('GET', `/v1/channels/${id}/messages?limit=${limit}&offset=${offset}`),

  // Post message
  postMessage: (id, content) =>
    apiCall('POST', `/v1/channels/${id}/messages`, { content }),
};

// ===== MESSAGES =====

export const messageService = {
  // Update message
  update: (id, content) =>
    apiCall('PUT', `/v1/messages/${id}`, { content }),

  // Delete message
  delete: (id) =>
    apiCall('DELETE', `/v1/messages/${id}`),
};

// ===== FRIENDSHIPS =====

export const friendshipService = {
  // Get friend requests
  getRequests: () =>
    apiCall('GET', '/v1/friendships/requests'),

  // Get all friends
  getAll: () =>
    apiCall('GET', '/v1/friendships'),

  // Send friend request
  send: (recipientId) =>
    apiCall('POST', '/v1/friendships', { recipientId }),

  // Accept friend request
  accept: (id) =>
    apiCall('POST', `/v1/friendships/${id}/accept`),

  // Reject friend request
  reject: (id) =>
    apiCall('POST', `/v1/friendships/${id}/reject`),
};

// ===== SOCKET.IO REAL-TIME =====

export const socketService = {
  // Initialize socket connection
  connect: (userId) => {
    socket = io(API_BASE_URL.replace('/api', ''), {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('✅ Socket.io connesso');
      socket.emit('user-join', { userId });
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return socket;
  },

  // Disconnect socket
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  // Get socket instance
  getSocket: () => socket,

  // Send message to channel
  sendMessage: (content, channelId, userId) => {
    if (socket) {
      socket.emit('send-message', { content, channelId, userId });
    }
  },

  // Send direct message
  sendDM: (content, recipientId, senderId) => {
    if (socket) {
      socket.emit('send-dm', { content, recipientId, senderId });
    }
  },

  // Join channel
  joinChannel: (channelId) => {
    if (socket) {
      socket.emit('join-channel', { channelId });
    }
  },

  // Leave channel
  leaveChannel: (channelId) => {
    if (socket) {
      socket.emit('leave-channel', { channelId });
    }
  },

  // Send typing notification
  sendTyping: (channelId, userId, isTyping = true) => {
    if (socket) {
      socket.emit('user-typing', { channelId, userId, isTyping });
    }
  },

  // Listen for channel messages
  onChannelMessage: (channelId, callback) => {
    if (socket) {
      socket.on(`channel-${channelId}`, callback);
    }
  },

  // Listen for DMs
  onDM: (callback) => {
    if (socket) {
      socket.on('receive-dm', callback);
    }
  },

  // Listen for user online
  onUserOnline: (callback) => {
    if (socket) {
      socket.on('user-online', callback);
    }
  },

  // Listen for user offline
  onUserOffline: (callback) => {
    if (socket) {
      socket.on('user-offline', callback);
    }
  },

  // Listen for typing
  onTyping: (channelId, callback) => {
    if (socket) {
      socket.on(`typing-${channelId}`, callback);
    }
  },

  // Remove listener
  off: (event) => {
    if (socket) {
      socket.off(event);
    }
  },
};

// ===== ANIME DATA =====

export const animeService = {
  // Get streaming platforms
  getStreamingPlatforms: (title, country = 'US') =>
    apiCall('GET', `/justwatch?title=${encodeURIComponent(title)}&country=${country}`),
};

export default {
  authService,
  communityService,
  channelService,
  messageService,
  friendshipService,
  socketService,
  animeService,
};
