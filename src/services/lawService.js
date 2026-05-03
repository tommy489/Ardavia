const db = require('./db');

const createLaw = (guildId, title, content, creatorId, voteId = null) => {
  const id = db.getNextId('laws');
  db.insert('laws', {
    id,
    guildId,
    title,
    content,
    creatorId,
    voteId,
    status: 'active',
    createdAt: new Date().toISOString()
  });
  return id;
};

const getLaws = (guildId) => {
  return db.filter('laws', { guildId, status: 'active' });
};

const getLaw = (guildId, id) => {
  return db.find('laws', { guildId, id });
};

module.exports = { createLaw, getLaws, getLaw };
