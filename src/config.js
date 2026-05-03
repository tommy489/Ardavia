const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.TOKEN) {
  console.error('[FATAL] TOKEN manquant. Renseignez TOKEN dans le fichier .env');
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  console.error('[FATAL] CLIENT_ID manquant. Renseignez CLIENT_ID dans le fichier .env');
  process.exit(1);
}

module.exports = {
  token:           process.env.TOKEN,
  clientId:        process.env.CLIENT_ID,
  guildId:         process.env.GUILD_ID         || null,
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'Crédits'
};
