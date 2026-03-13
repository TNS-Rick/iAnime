const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB, getPool, resetDatabase } = require('./connection');

const toJson = (value) => JSON.stringify(value);
const hashPassword = (value) => bcrypt.hash(value, 10);

const seedDB = async () => {
  let connection;

  try {
    await connectDB();
    console.log('🗑️  Ricreazione schema MySQL...');
    await resetDatabase();

    console.log('🌱 Inizio seed del database...');

    connection = await getPool().getConnection();
    await connection.beginTransaction();

    const defaultNotifications = toJson({
      mention: true,
      friendRequest: true,
      systemNotifications: true,
      communityList: [],
      limitedPeople: [],
    });

    const password1 = await hashPassword('password123');
    const password2 = await hashPassword('password123');
    const password3 = await hashPassword('password123');

    const [user1Result] = await connection.execute(
      `INSERT INTO users (
        email, password, username, bio, profileImage, displayNameColor, isPremium,
        premiumExpiresAt, notifications, twoFAEnabled, whoCanInvite,
        acceptStrangerMessages, friendsList, blockedUsers, communities
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'naruto@ianime.com',
        password1,
        'naruto_fan',
        'Amante di Naruto e azione!',
        'https://via.placeholder.com/150',
        '#FF6B6B',
        1,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        defaultNotifications,
        0,
        'all',
        1,
        toJson([]),
        toJson([]),
        toJson([]),
      ]
    );
    const user1Id = user1Result.insertId;

    const [user2Result] = await connection.execute(
      `INSERT INTO users (
        email, password, username, bio, profileImage, notifications, isPremium,
        twoFAEnabled, whoCanInvite, acceptStrangerMessages, friendsList, blockedUsers, communities
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'zenitsu@ianime.com',
        password2,
        'demon_slayer_fan',
        'Demon Slayer rulz!',
        'https://via.placeholder.com/150',
        defaultNotifications,
        0,
        0,
        'friends',
        0,
        toJson([]),
        toJson([]),
        toJson([]),
      ]
    );
    const user2Id = user2Result.insertId;

    const [user3Result] = await connection.execute(
      `INSERT INTO users (
        email, password, username, bio, profileImage, notifications, isPremium,
        twoFAEnabled, twoFAMethod, whoCanInvite, acceptStrangerMessages,
        friendsList, blockedUsers, communities
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'tanjiro@ianime.com',
        password3,
        'tanjiro_sama',
        'On a journey to save Nezuko',
        'https://via.placeholder.com/150',
        defaultNotifications,
        0,
        1,
        'app',
        'friends',
        0,
        toJson([]),
        toJson([]),
        toJson([]),
      ]
    );
    const user3Id = user3Result.insertId;

    console.log('✅ Utenti creati');

    await connection.execute(
      `INSERT INTO animes (
        title, description, coverImage, rating, category, status, jikanId, platforms, hashtags, followedByCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Naruto Shippuden',
        'L\'epica storia di Naruto continua...',
        'https://via.placeholder.com/300x400',
        8.5,
        'Action, Shounen, Ninja',
        'completed',
        1735,
        toJson([
          { name: 'Crunchyroll', url: 'https://crunchyroll.com', country: 'IT', type: 'subscription' },
          { name: 'Netflix', url: 'https://netflix.com', country: 'IT', type: 'subscription' },
        ]),
        toJson(['#naruto', '#shippuden', '#anime']),
        15000,
      ]
    );

    await connection.execute(
      `INSERT INTO animes (
        title, description, coverImage, rating, category, status, jikanId, platforms, hashtags, followedByCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Demon Slayer',
        'Tanjiro affronta il mondo dei demoni',
        'https://via.placeholder.com/300x400',
        9.0,
        'Action, Shounen, Supernatural',
        'ongoing',
        38000,
        toJson([{ name: 'Crunchyroll', url: 'https://crunchyroll.com', country: 'IT', type: 'subscription' }]),
        toJson(['#demon-slayer', '#kimetsu', '#anime']),
        20000,
      ]
    );

    await connection.execute(
      `INSERT INTO animes (
        title, description, coverImage, rating, category, status, jikanId, platforms, hashtags, followedByCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Jujutsu Kaisen',
        'Yuji diventa il recipiente di un potente demone',
        'https://via.placeholder.com/300x400',
        8.8,
        'Action, Shounen, Supernatural',
        'ongoing',
        40748,
        toJson([{ name: 'Crunchyroll', url: 'https://crunchyroll.com', country: 'IT', type: 'subscription' }]),
        toJson(['#jujutsu-kaisen', '#anime']),
        18000,
      ]
    );

    console.log('✅ Anime creati');

    const [adminRoleResult] = await connection.execute(
      'INSERT INTO roles (name, permissions, color, members) VALUES (?, ?, ?, ?)',
      ['Admin', toJson(['kick', 'deleteMsg', 'mute', 'manageRoles', 'manageChannels', 'pinMessages']), '#FF0000', toJson([user1Id])]
    );
    const adminRoleId = adminRoleResult.insertId;

    const [moderatorRoleResult] = await connection.execute(
      'INSERT INTO roles (name, permissions, color, members) VALUES (?, ?, ?, ?)',
      ['Moderator', toJson(['deleteMsg', 'mute', 'pinMessages']), '#FFA500', toJson([user2Id])]
    );
    const moderatorRoleId = moderatorRoleResult.insertId;

    const [memberRoleResult] = await connection.execute(
      'INSERT INTO roles (name, permissions, color, members) VALUES (?, ?, ?, ?)',
      ['Member', toJson([]), '#0000FF', toJson([user3Id])]
    );
    const memberRoleId = memberRoleResult.insertId;

    console.log('✅ Ruoli creati');

    const channelPermissions = toJson([
      { roleId: adminRoleId, canRead: true, canWrite: true },
      { roleId: moderatorRoleId, canRead: true, canWrite: true },
      { roleId: memberRoleId, canRead: true, canWrite: true },
    ]);

    const [generalChannelResult] = await connection.execute(
      'INSERT INTO channels (name, type, hashtags, maxMembers, permissions, messages, members) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['general', 'text', toJson(['#naruto', '#discussion']), 100, channelPermissions, toJson([]), toJson([user1Id, user2Id, user3Id])]
    );
    const generalChannelId = generalChannelResult.insertId;

    const [voiceChannelResult] = await connection.execute(
      'INSERT INTO channels (name, type, hashtags, maxMembers, permissions, messages, members) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['voice-chat', 'voice', toJson([]), 10, channelPermissions, toJson([]), toJson([user1Id, user2Id])]
    );
    const voiceChannelId = voiceChannelResult.insertId;

    const [artChannelResult] = await connection.execute(
      'INSERT INTO channels (name, type, hashtags, maxMembers, permissions, messages, members) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['fan-art', 'text', toJson(['#art', '#fanart']), 10, channelPermissions, toJson([]), toJson([user1Id, user3Id])]
    );
    const artChannelId = artChannelResult.insertId;

    console.log('✅ Canali creati');

    const [textChannelGroupResult] = await connection.execute(
      'INSERT INTO channel_groups (name, channels) VALUES (?, ?)',
      ['Text Channels', toJson([generalChannelId, artChannelId])]
    );
    const textChannelGroupId = textChannelGroupResult.insertId;

    const [voiceChannelGroupResult] = await connection.execute(
      'INSERT INTO channel_groups (name, channels) VALUES (?, ?)',
      ['Voice Channels', toJson([voiceChannelId])]
    );
    const voiceChannelGroupId = voiceChannelGroupResult.insertId;

    console.log('✅ Gruppi di canali creati');

    const [communityResult] = await connection.execute(
      `INSERT INTO communities (
        name, description, adminId, roles, categories, channelGroups, members, pinnedMessages
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Naruto Central',
        'La comunità ufficiale per i fan di Naruto!',
        user1Id,
        toJson([adminRoleId, moderatorRoleId, memberRoleId]),
        toJson(['naruto', 'shippuden']),
        toJson([textChannelGroupId, voiceChannelGroupId]),
        toJson([user1Id, user2Id, user3Id]),
        toJson([]),
      ]
    );
    const narutoCommunityId = communityResult.insertId;

    console.log('✅ Comunità creata');

    const [msg1Result] = await connection.execute(
      'INSERT INTO messages (content, authorId, channelId, reactions, mentions) VALUES (?, ?, ?, ?, ?)',
      ['Benvenuti nella comunità di Naruto! 🎉', user1Id, generalChannelId, toJson([]), toJson([])]
    );
    const msg1Id = msg1Result.insertId;

    const [msg2Result] = await connection.execute(
      'INSERT INTO messages (content, authorId, channelId, reactions, mentions) VALUES (?, ?, ?, ?, ?)',
      ['Mi piace tantissimo questo anime!', user2Id, generalChannelId, toJson([]), toJson([user1Id])]
    );
    const msg2Id = msg2Result.insertId;

    await connection.execute('UPDATE channels SET messages = ? WHERE id = ?', [toJson([msg1Id, msg2Id]), generalChannelId]);
    await connection.execute('UPDATE communities SET pinnedMessages = ? WHERE id = ?', [toJson([msg1Id]), narutoCommunityId]);
    await connection.execute('UPDATE users SET communities = ?, friendsList = ? WHERE id = ?', [toJson([narutoCommunityId]), toJson([user2Id]), user1Id]);
    await connection.execute('UPDATE users SET communities = ?, friendsList = ? WHERE id = ?', [toJson([narutoCommunityId]), toJson([user1Id]), user2Id]);
    await connection.execute('UPDATE users SET communities = ? WHERE id = ?', [toJson([narutoCommunityId]), user3Id]);

    console.log('✅ Messaggi creati');

    await connection.execute('INSERT INTO friendships (requester, recipient, status) VALUES (?, ?, ?)', [user1Id, user2Id, 'accepted']);
    await connection.execute('INSERT INTO friendships (requester, recipient, status) VALUES (?, ?, ?)', [user1Id, user3Id, 'pending']);

    console.log('✅ Amicizie create');

    await connection.execute('INSERT INTO direct_messages (participants, messages) VALUES (?, ?)', [toJson([user1Id, user2Id]), toJson([])]);

    console.log('✅ Sessione DM creata');

    await connection.commit();

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

    connection.release();
    await disconnectDB();
  } catch (error) {
    console.error('❌ Errore seed database:', error);

    if (connection) {
      await connection.rollback();
      connection.release();
    }

    await disconnectDB();
    process.exit(1);
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  seedDB();
}

module.exports = seedDB;
