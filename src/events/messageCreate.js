const raidProtect = require('../services/raidProtect');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    await raidProtect.checkMessage(message);
  }
};
