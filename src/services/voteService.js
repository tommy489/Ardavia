const db = require('./db');

const createVote = (guildId, title, description, creatorId, quorum = 1, majority = 'simple') => {
  const id = db.getNextId('votes');
  db.insert('votes', {
    id,
    guildId,
    title,
    description,
    creatorId,
    messageId: null,
    status: 'open',
    quorum,
    majority,
    createdAt: new Date().toISOString(),
    endedAt: null
  });
  return id;
};

const setVoteMessage = (voteId, messageId) => {
  db.update('votes', { id: voteId }, { messageId });
};

const getOpenVote = (voteId) => {
  return db.find('votes', { id: voteId, status: 'open' });
};

const castVote = (voteId, userId, choice) => {
  db.upsert('vote_responses', { voteId, userId }, { voteId, userId, choice, createdAt: new Date().toISOString() });
};

const getVotes = (voteId) => {
  const responses = db.filter('vote_responses', { voteId });
  return responses.reduce((summary, response) => {
    summary[response.choice] = (summary[response.choice] || 0) + 1;
    return summary;
  }, {});
};

const getResults = (voteId) => {
  const counts = getVotes(voteId);
  const yes = counts.yes || 0;
  const no = counts.no || 0;
  const total = yes + no;
  const vote = db.find('votes', { id: voteId });
  return { yes, no, total, vote };
};

const endVote = (voteId) => {
  db.update('votes', { id: voteId }, { status: 'closed', endedAt: new Date().toISOString() });
  return getResults(voteId);
};

module.exports = { createVote, setVoteMessage, getOpenVote, castVote, getResults, endVote };
