const { EmbedBuilder } = require('discord.js');
const db = require('./db');
const logger = require('./logger');

const getConfig = (guildId) => db.find('welcome_config', { guildId }) || null;

const setConfig = (guildId, values) => {
  const current = getConfig(guildId) || { guildId, enabled: true };
  db.upsert('welcome_config', { guildId }, { ...current, ...values, guildId });
};

const disable = (guildId) => setConfig(guildId, { enabled: false });

const format = (template, member) =>
  String(template)
    .replace(/{user}/g,        member.toString())
    .replace(/{username}/g,    member.user.username)
    .replace(/{server}/g,      member.guild.name)
    .replace(/{memberCount}/g, String(member.guild.memberCount));

const buildEmbed = (member, cfg) => {
  const embed = new EmbedBuilder()
    .setColor(cfg.color || 0x2ecc71)
    .setTitle(format(cfg.title || 'Welcome to {server}!', member))
    .setDescription(format(cfg.description || 'Welcome {user}! You are member #**{memberCount}**.', member))
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'Ardavia Council' })
    .setTimestamp();

  if (cfg.imageUrl) {
    try { embed.setImage(cfg.imageUrl); } catch (_) {}
  }
  return embed;
};

const sendWelcome = async (member) => {
  const cfg = getConfig(member.guild.id);
  if (!cfg || !cfg.enabled || !cfg.channelId) return;

  const ch = member.guild.channels.cache.get(cfg.channelId);
  if (!ch) return;

  try {
    await ch.send({ embeds: [buildEmbed(member, cfg)] });
  } catch (e) {
    logger.error('Welcome send error:', e.message);
  }
};

const assignAutorole = async (member) => {
  const cfg = getConfig(member.guild.id);
  if (!cfg || !cfg.autoroleId) return;

  const role = member.guild.roles.cache.get(cfg.autoroleId);
  if (!role) return;

  try {
    await member.roles.add(role);
  } catch (e) {
    logger.error('Autorole error:', e.message);
  }
};

module.exports = { getConfig, setConfig, disable, buildEmbed, sendWelcome, assignAutorole, format };
