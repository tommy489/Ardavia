const securityService = require('../services/securityService');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    await securityService.checkMessage(message);
  }
};
