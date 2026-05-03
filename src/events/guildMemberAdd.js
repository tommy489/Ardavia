const securityService = require('../services/securityService');
const welcomeService  = require('../services/welcomeService');

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    await securityService.checkJoin(member);
    await welcomeService.sendWelcome(member);
    await welcomeService.assignAutorole(member);
  }
};
