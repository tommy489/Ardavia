const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { token, clientId, guildId } = require('./config');
const db = require('./services/db');
const logger = require('./services/logger');

// GuildMembers is a privileged intent — enable it in Discord Developer Portal → Bot → Privileged Gateway Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

client.commands = new Collection();
client.db = db;
client.logger = logger;
client.commandArray = [];

const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
  client.commandArray.push(command.data.toJSON());
}

const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) client.once(event.name, (...args) => event.execute(client, ...args));
  else client.on(event.name, (...args) => event.execute(client, ...args));
}

async function deployCommands() {
  try {
    const { REST, Routes } = require('discord.js');
    const rest = new REST({ version: '10' }).setToken(token);

    if (!clientId) {
      logger.warn('CLIENT_ID manquant, enregistrement des commandes impossible.');
      return;
    }

    await rest.put(Routes.applicationCommands(clientId), { body: client.commandArray });
    logger.info(`${client.commandArray.length} commandes enregistrées globalement.`);
  } catch (error) {
    logger.error('Erreur lors de l’enregistrement des commandes :', error);
  }
}

client.once('ready', async () => {
  logger.info(`Connecté en tant que ${client.user.tag}`);
  await deployCommands();
});

client.login(token).catch(error => logger.error('Impossible de se connecter au bot :', error));
