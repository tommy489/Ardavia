const db = require('./db');

const setLicenseRole = (guildId, roleId) => {
  db.upsert('parish_roles', { guildId, roleId }, { guildId, roleId });
};

const getLicenseRoles = (guildId) => {
  return db.filter('parish_roles', { guildId }).map(row => row.roleId);
};

const giveLicense = (guildId, userId, type, givenBy) => {
  db.upsert('licenses', { guildId, userId, type }, { guildId, userId, type, givenBy, createdAt: new Date().toISOString() });
};

const removeLicense = (guildId, userId, type) => {
  db.remove('licenses', { guildId, userId, type });
};

const listLicenses = (guildId, userId) => {
  return db.filter('licenses', { guildId, userId });
};

module.exports = { setLicenseRole, getLicenseRoles, giveLicense, removeLicense, listLicenses };
