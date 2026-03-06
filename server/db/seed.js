const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./connection');
const {
  User,
  Anime,
  Community,
  Role,
  Channel,
  ChannelGroup,
  Message,
  DirectMessage,
  Friendship,
} = require('../models');

const seedDB = async () => {
  try {
    await connectDB();

    // Clear all collections
    console.log('🗑️  Pulizia database...');
    await Promise.all([
      User.deleteMany({}),
      Anime.deleteMany({}),
      Community.deleteMany({}),
      Role.deleteMany({}),
      Channel.deleteMany({}),
      ChannelGroup.deleteMany({}),
      Message.deleteMany({}),
      DirectMessage.deleteMany({}),
      Friendship.deleteMany({}),
    ]);

    console.log('🌱 Inizio seed del database...');

    // Create sample users
    const user1 = await User.create({
      email: 'naruto@ianime.com',
      password: 'password123',
      username: 'naruto_fan',
      bio: 'Amante di Naruto e azione!',
      profileImage: 'https://via.placeholder.com/150',
      displayNameColor: '#FF6B6B',
      isPremium: true,
      premiumExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      twoFAEnabled: false,
      whoCanInvite: 'all',
      acceptStrangerMessages: true,
    });

    const user2 = await User.create({
      email: 'zenitsu@ianime.com',
      password: 'password123',
      username: 'demon_slayer_fan',
      bio: 'Demon Slayer rulz!',
      profileImage: 'https://via.placeholder.com/150',
      isPremium: false,
      twoFAEnabled: false,
      whoCanInvite: 'friends',
      acceptStrangerMessages: false,
    });

    const user3 = await User.create({
      email: 'tanjiro@ianime.com',
      password: 'password123',
      username: 'tanjiro_sama',
      bio: 'On a journey to save Nezuko',
      profileImage: 'https://via.placeholder.com/150',
      isPremium: false,
      twoFAEnabled: true,
      twoFAMethod: 'app',
      whoCanInvite: 'friends',
      acceptStrangerMessages: false,
    });

    console.log('✅ Utenti creati');

    // Create sample animes
    const anime1 = await Anime.create({
      title: 'Naruto Shippuden',
      description: 'L\'epica storia di Naruto continua...',
      coverImage: 'https://via.placeholder.com/300x400',
      rating: 8.5,
      category: 'Action, Shounen, Ninja',
      status: 'completed',
      jikanId: 1735,
      platforms: [
        { name: 'Crunchyroll', url: 'https://crunchyroll.com', country: 'IT', type: 'subscription' },
        { name: 'Netflix', url: 'https://netflix.com', country: 'IT', type: 'subscription' },
      ],
      hashtags: ['#naruto', '#shippuden', '#anime'],
      followedByCount: 15000,
    });

    const anime2 = await Anime.create({
      title: 'Demon Slayer',
      description: 'Tanjiro affronta il mondo dei demoni',
      coverImage: 'https://via.placeholder.com/300x400',
      rating: 9.0,
      category: 'Action, Shounen, Supernatural',
      status: 'ongoing',
      jikanId: 38000,
      platforms: [
        { name: 'Crunchyroll', url: 'https://crunchyroll.com', country: 'IT', type: 'subscription' },
      ],
      hashtags: ['#demon-slayer', '#kimetsu', '#anime'],
      followedByCount: 20000,
    });

    const anime3 = await Anime.create({
      title: 'Jujutsu Kaisen',
      description: 'Yuji diventa il recipiente di un potente demone',
      coverImage: 'https://via.placeholder.com/300x400',
      rating: 8.8,
      category: 'Action, Shounen, Supernatural',
      status: 'ongoing',
      jikanId: 40748,
      platforms: [
        { name: 'Crunchyroll', url: 'https://crunchyroll.com', country: 'IT', type: 'subscription' },
      ],
      hashtags: ['#jujutsu-kaisen', '#anime'],
      followedByCount: 18000,
    });

    console.log('✅ Anime creati');

    // Create roles
    const adminRole = await Role.create({
      name: 'Admin',
      permissions: ['kick', 'deleteMsg', 'mute', 'manageRoles', 'manageChannels', 'pinMessages'],
      color: '#FF0000',
      members: [user1._id],
    });

    const moderatorRole = await Role.create({
      name: 'Moderator',
      permissions: ['deleteMsg', 'mute', 'pinMessages'],
      color: '#FFA500',
      members: [user2._id],
    });

    const memberRole = await Role.create({
      name: 'Member',
      permissions: [],
      color: '#0000FF',
      members: [user3._id],
    });

    console.log('✅ Ruoli creati');

    // Create channels
    const generalChannel = await Channel.create({
      name: 'general',
      type: 'text',
      hashtags: ['#naruto', '#discussion'],
      maxMembers: 100,
      permissions: [
        { roleId: adminRole._id, canRead: true, canWrite: true },
        { roleId: moderatorRole._id, canRead: true, canWrite: true },
        { roleId: memberRole._id, canRead: true, canWrite: true },
      ],
      members: [user1._id, user2._id, user3._id],
    });

    const voiceChannel = await Channel.create({
      name: 'voice-chat',
      type: 'voice',
      maxMembers: 10,
      permissions: [
        { roleId: adminRole._id, canRead: true, canWrite: true },
        { roleId: moderatorRole._id, canRead: true, canWrite: true },
        { roleId: memberRole._id, canRead: true, canWrite: true },
      ],
      members: [user1._id, user2._id],
    });

    const artChannel = await Channel.create({
      name: 'fan-art',
      type: 'text',
      hashtags: ['#art', '#fanart'],
      permissions: [
        { roleId: adminRole._id, canRead: true, canWrite: true },
        { roleId: moderatorRole._id, canRead: true, canWrite: true },
        { roleId: memberRole._id, canRead: true, canWrite: true },
      ],
      members: [user1._id, user3._id],
    });

    console.log('✅ Canali creati');

    // Create channel group
    const textChannelGroup = await ChannelGroup.create({
      name: 'Text Channels',
      channels: [generalChannel._id, artChannel._id],
    });

    const voiceChannelGroup = await ChannelGroup.create({
      name: 'Voice Channels',
      channels: [voiceChannel._id],
    });

    console.log('✅ Gruppi di canali creati');

    // Create community
    const narutoComm = await Community.create({
      name: 'Naruto Central',
      description: 'La comunità ufficiale per i fan di Naruto!',
      adminId: user1._id,
      roles: [adminRole._id, moderatorRole._id, memberRole._id],
      categories: ['naruto', 'shippuden'],
      channelGroups: [textChannelGroup._id, voiceChannelGroup._id],
      members: [user1._id, user2._id, user3._id],
    });

    console.log('✅ Comunità creata');

    // Create sample messages
    const msg1 = await Message.create({
      content: 'Benvenuti nella comunità di Naruto! 🎉',
      authorId: user1._id,
      channelId: generalChannel._id,
      mentions: [],
    });

    const msg2 = await Message.create({
      content: 'Mi piace tantissimo questo anime!',
      authorId: user2._id,
      channelId: generalChannel._id,
      mentions: [user1._id],
    });

    // Update channel with messages
    await Channel.findByIdAndUpdate(generalChannel._id, {
      $push: { messages: [msg1._id, msg2._id] },
    });

    console.log('✅ Messaggi creati');

    // Create friendships
    const friendship1 = await Friendship.create({
      requester: user1._id,
      recipient: user2._id,
      status: 'accepted',
    });

    const friendship2 = await Friendship.create({
      requester: user1._id,
      recipient: user3._id,
      status: 'pending',
    });

    console.log('✅ Amicizie create');

    // Create direct message session
    const dmSession = await DirectMessage.create({
      participants: [user1._id, user2._id],
      messages: [],
    });

    console.log('✅ Sessione DM creata');

    console.log('✨ Database seed completato con successo!');
    console.log(`
📊 Statistiche:
  - Utenti: 3
  - Anime: 3
  - Comunità: 1
  - Canali: 3
  - Messaggi: 2
  - Amicizie: 2
    `);

    await disconnectDB();
  } catch (error) {
    console.error('❌ Errore seed database:', error);
    await disconnectDB();
    process.exit(1);
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  seedDB();
}

module.exports = seedDB;
