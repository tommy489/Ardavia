const db = require('./db');

const createTicketPanel = (guildId, channelId, panelMessageId, staffRoleId) => {
  db.upsert('ticket_panels', { guildId }, { guildId, channelId, panelMessageId, staffRoleId });
};

const getTicketPanel = (guildId) => {
  return db.find('ticket_panels', { guildId });
};

const createTicket = (guildId, userId, channelId) => {
  const id = db.getNextId('tickets');
  db.insert('tickets', { id, guildId, userId, channelId, status: 'open', createdAt: new Date().toISOString() });
  return id;
};

const closeTicket = (guildId, channelId) => {
  db.update('tickets', { guildId, channelId }, { status: 'closed', closedAt: new Date().toISOString() });
};

const getTicketByChannel = (guildId, channelId) => {
  return db.find('tickets', { guildId, channelId });
};

module.exports = { createTicketPanel, getTicketPanel, createTicket, closeTicket, getTicketByChannel };
