const { EmbedBuilder } = require('discord.js');
const db = require('./db');
const logger = require('./logger');

const messageTrackers = new Map();
const joinTrackers    = new Map();
const warnCounts      = new Map();

const DEFAULTS = {
  enabled: false,
  logsChannelId: null,
  intervalSeconds: 10,
  antispam_enabled:    true,  antispam_threshold:    6,    antispam_action:    'mute',
  antiraid_enabled:    true,  antiraid_threshold:    4,    antiraid_action:    'kick',
  antimention_enabled: true,  antimention_threshold: 5,    antimention_action: 'mute',
  antibot_enabled:     true,  antibot_action:        'ban',
  whitelist_roles: []
};

const getConfig = (guildId) => {
  let cfg = db.find('security_config', { guildId });
  if (!cfg) {
    cfg = { guildId, ...DEFAULTS };
    db.insert('security_config', cfg);
  }
  return Object.assign({}, DEFAULTS, cfg);
};

const setConfig = (guildId, values) => {
  const current = getConfig(guildId);
  db.upsert('security_config', { guildId }, { ...current, ...values, guildId });
};

const addWhitelistRole = (guildId, roleId) => {
  const cfg = getConfig(guildId);
  const roles = Array.isArray(cfg.whitelist_roles) ? cfg.whitelist_roles : [];
  if (!roles.includes(roleId)) setConfig(guildId, { whitelist_roles: [...roles, roleId] });
};

const removeWhitelistRole = (guildId, roleId) => {
  const cfg = getConfig(guildId);
  const roles = Array.isArray(cfg.whitelist_roles) ? cfg.whitelist_roles : [];
  setConfig(guildId, { whitelist_roles: roles.filter(id => id !== roleId) });
};

const isWhitelisted = (member, cfg) => {
  if (member.permissions.has('ManageGuild')) return true;
  const roles = Array.isArray(cfg.whitelist_roles) ? cfg.whitelist_roles : [];
  return member.roles.cache.some(r => roles.includes(r.id));
};

const sendLog = async (guild, cfg, description, color = 0xe74c3c) => {
  if (!cfg.logsChannelId) return;
  const ch = guild.channels.cache.get(cfg.logsChannelId);
  if (!ch) return;
  try {
    await ch.send({
      embeds: [new EmbedBuilder()
        .setColor(color)
        .setTitle('🛡️  Sécurité — Événement Détecté')
        .setDescription(description)
        .setFooter({ text: 'Ardavia Council • Sécurité' })
        .setTimestamp()
      ]
    });
  } catch (e) {
    logger.error('Security log error:', e.message);
  }
};

const performAction = async (member, reason, action, guild, cfg) => {
  try {
    switch (action) {
      case 'ban':
        if (member.bannable) { await member.ban({ reason }); return true; }
        break;
      case 'kick':
        if (member.kickable) { await member.kick(reason); return true; }
        break;
      case 'mute':
        if (member.moderatable) { await member.timeout(10 * 60 * 1000, reason); return true; }
        break;
      case 'warn': {
        const key = `${guild.id}:${member.id}`;
        const count = (warnCounts.get(key) || 0) + 1;
        warnCounts.set(key, count);
        try { await member.send(`⚠️ **Avertissement [${count}/3]** — ${reason} — Ardavia Council`); } catch (_) {}
        if (count >= 3) {
          warnCounts.delete(key);
          return performAction(member, reason, 'mute', guild, cfg);
        }
        return true;
      }
    }
  } catch (e) {
    logger.error('Security action error:', e.message);
  }
  return false;
};

const checkMessage = async (message) => {
  if (message.author.bot || !message.guild) return;
  const cfg = getConfig(message.guild.id);
  if (!cfg.enabled) return;

  const { member } = message;
  if (!member || isWhitelisted(member, cfg)) return;

  // Anti mass-mention
  if (cfg.antimention_enabled) {
    const cnt = message.mentions.users.size + message.mentions.roles.size;
    if (cnt >= cfg.antimention_threshold) {
      const ok = await performAction(member, 'Mention de masse', cfg.antimention_action, message.guild, cfg);
      if (ok) {
        try { await message.delete(); } catch (_) {}
        await sendLog(message.guild, cfg,
          `**⚠️ Anti Mass-Mention** — ${message.author} (\`${message.author.tag}\`)\n${cnt} mentions → Action : \`${cfg.antimention_action}\``
        );
      }
      return;
    }
  }

  // Anti-spam
  if (cfg.antispam_enabled) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    let rec = messageTrackers.get(key);

    if (!rec || now > rec.expires) {
      rec = { count: 1, expires: now + cfg.intervalSeconds * 1000 };
    } else {
      rec.count++;
    }
    messageTrackers.set(key, rec);

    if (rec.count >= cfg.antispam_threshold) {
      messageTrackers.delete(key);
      const ok = await performAction(member, 'Spam de messages', cfg.antispam_action, message.guild, cfg);
      if (ok) {
        await sendLog(message.guild, cfg,
          `**⚠️ Anti-Spam** — ${message.author} (\`${message.author.tag}\`)\n${rec.count} messages en ${cfg.intervalSeconds}s → Action : \`${cfg.antispam_action}\``
        );
      }
    }
  }
};

const checkJoin = async (member) => {
  const { guild } = member;
  const cfg = getConfig(guild.id);
  if (!cfg.enabled) return;

  // Anti-bot
  if (cfg.antibot_enabled && member.user.bot) {
    const ok = await performAction(member, 'Bot non autorisé', cfg.antibot_action, guild, cfg);
    if (ok) await sendLog(guild, cfg, `**🤖 Anti-Bot** — ${member.user.tag} (${member.id})\n→ Action : \`${cfg.antibot_action}\``);
    return;
  }

  // Anti-raid
  if (cfg.antiraid_enabled) {
    const now = Date.now();
    let rec = joinTrackers.get(guild.id);
    if (!rec || now > rec.expires) {
      rec = { count: 1, expires: now + cfg.intervalSeconds * 1000 };
    } else {
      rec.count++;
    }
    joinTrackers.set(guild.id, rec);

    if (rec.count >= cfg.antiraid_threshold) {
      joinTrackers.delete(guild.id);
      const ok = await performAction(member, 'Raid détecté', cfg.antiraid_action, guild, cfg);
      if (ok) await sendLog(guild, cfg,
        `**🚨 Anti-Raid** — ${member.user.tag} (${member.id})\n${rec.count} arrivées en ${cfg.intervalSeconds}s → Action : \`${cfg.antiraid_action}\``
      );
    }
  }
};

module.exports = { getConfig, setConfig, addWhitelistRole, removeWhitelistRole, checkMessage, checkJoin, sendLog };
