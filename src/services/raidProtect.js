const { EmbedBuilder } = require('discord.js');
const db = require('./db');
const logger = require('./logger');

const messageTrackers = new Map();
const joinTrackers = new Map();

const getConfig = (guildId) => {
  let config = db.find('raid_config', { guildId });
  if (config) return config;
  db.insert('raid_config', {
    guildId,
    enabled: 1,
    action: 'mute',
    mentionThreshold: 5,
    joinThreshold: 4,
    messageThreshold: 6,
    intervalSeconds: 10,
    logsChannelId: null
  });
  return db.find('raid_config', { guildId });
};

const setConfig = (guildId, values) => {
  const current = getConfig(guildId);
  db.upsert('raid_config', { guildId }, {
    guildId,
    enabled: values.enabled ?? current.enabled,
    action: values.action ?? current.action,
    mentionThreshold: values.mentionThreshold ?? current.mentionThreshold,
    joinThreshold: values.joinThreshold ?? current.joinThreshold,
    messageThreshold: values.messageThreshold ?? current.messageThreshold,
    intervalSeconds: values.intervalSeconds ?? current.intervalSeconds,
    logsChannelId: values.logsChannelId ?? current.logsChannelId
  });
};

const getLogsChannel = async (guild, guildId) => {
  const config = getConfig(guildId);
  if (!config.logsChannelId) return null;
  return guild.channels.cache.get(config.logsChannelId) || null;
};

const logRaidAction = async (guild, message) => {
  const channel = await getLogsChannel(guild, guild.id);
  if (!channel) return;
  channel.send({ embeds: [new EmbedBuilder().setTitle('RaidProtect').setDescription(message).setColor(0xe74c3c).setTimestamp()] });
};

const performAction = async (member, reason, config) => {
  if (!member.moderatable) return false;
  try {
    if (config.action === 'ban' && member.bannable) await member.ban({ reason });
    else if (config.action === 'kick' && member.kickable) await member.kick(reason);
    else if (config.action === 'mute' && member.manageable) await member.timeout(10 * 60 * 1000, reason);
    else return false;
    return true;
  } catch (error) {
    logger.error('Erreur RaidProtect action:', error);
    return false;
  }
};

const checkMessage = async (message) => {
  if (message.author.bot || !message.guild) return;
  const config = getConfig(message.guild.id);
  if (!config.enabled) return;

  const mentionCount = message.mentions.users.size + message.mentions.roles.size;
  if (mentionCount >= config.mentionThreshold) {
    const member = message.member;
    const applied = await performAction(member, 'Mention de masse détectée par RaidProtect', config);
    if (applied) await logRaidAction(message.guild, `Action appliquée à ${member.user.tag} pour mention de masse.`);
    return;
  }

  const key = `${message.guild.id}:${message.author.id}`;
  const record = messageTrackers.get(key) || { count: 0, expires: Date.now() + config.intervalSeconds * 1000 };
  if (Date.now() > record.expires) {
    record.count = 1;
    record.expires = Date.now() + config.intervalSeconds * 1000;
  } else {
    record.count += 1;
  }
  messageTrackers.set(key, record);

  if (record.count >= config.messageThreshold) {
    const applied = await performAction(message.member, 'Spam de messages détecté par RaidProtect', config);
    if (applied) await logRaidAction(message.guild, `Action appliquée à ${message.author.tag} pour spam de messages.`);
    messageTrackers.delete(key);
  }
};

const checkJoin = async (member) => {
  const guild = member.guild;
  const config = getConfig(guild.id);
  if (!config.enabled) return;

  const record = joinTrackers.get(guild.id) || { count: 0, expires: Date.now() + config.intervalSeconds * 1000 };
  if (Date.now() > record.expires) {
    record.count = 1;
    record.expires = Date.now() + config.intervalSeconds * 1000;
  } else {
    record.count += 1;
  }
  joinTrackers.set(guild.id, record);

  if (record.count >= config.joinThreshold) {
    const applied = await performAction(member, 'Arrivée massive détectée par RaidProtect', config);
    if (applied) await logRaidAction(guild, `Action appliquée à ${member.user.tag} pour arrivée massive.`);
    joinTrackers.delete(guild.id);
  }
};

module.exports = { getConfig, setConfig, checkMessage, checkJoin, getLogsChannel, logRaidAction };
