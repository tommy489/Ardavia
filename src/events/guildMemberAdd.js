const raidProtect = require('../services/raidProtect');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    await raidProtect.checkJoin(member);
  }
};
