const db = require('./db');

const CATEGORIES = {
  support:    { label: '🆘 Support',        color: 0x3498db },
  report:     { label: '🚨 Signalement',    color: 0xe74c3c },
  government: { label: '🏛️ Gouvernement',  color: 0xf1c40f }
};

const getCategoryMeta = (cat) => CATEGORIES[cat] || CATEGORIES.support;

const setPanel = (guildId, channelId, messageId, staffRoleId, logChannelId = null) => {
  db.upsert('ticket_panels', { guildId }, { guildId, channelId, messageId, staffRoleId, logChannelId });
};

const getPanel = (guildId) => db.find('ticket_panels', { guildId });

const createTicket = (guildId, userId, channelId, category = 'support') => {
  const id = db.getNextId('tickets');
  db.insert('tickets', {
    id, guildId, userId, channelId, category,
    status: 'open', claimedBy: null, openMessageId: null,
    createdAt: new Date().toISOString()
  });
  return id;
};

const setOpenMessage = (guildId, channelId, messageId) => {
  db.update('tickets', { guildId, channelId }, { openMessageId: messageId });
};

const claimTicket = (guildId, channelId, claimedBy) => {
  db.update('tickets', { guildId, channelId }, { claimedBy });
};

const closeTicket = (guildId, channelId) => {
  db.update('tickets', { guildId, channelId }, { status: 'closed', closedAt: new Date().toISOString() });
};

const getByChannel = (guildId, channelId) => db.find('tickets', { guildId, channelId });

module.exports = { getCategoryMeta, setPanel, getPanel, createTicket, setOpenMessage, claimTicket, closeTicket, getByChannel };
