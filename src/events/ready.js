module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    client.logger.info(`Bot prêt : ${client.user.tag}`);
  }
};
