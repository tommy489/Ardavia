const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

module.exports = {
  token: process.env.TOKEN || 'MTQ5OTc3NzQ0NTQ0Mjc1MjUzMg.G2Mjii.eAS9-UHWM2RoJ98Ob8EKg_rA7ILCw_lZlHLW7g',
  clientId: process.env.CLIENT_ID || '1499777445442752532',
  guildId: process.env.GUILD_ID || '1498056046453850333',
  logsChannelId: process.env.LOGS_CHANNEL_ID || '',
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'Crédits',
  parliamentRoleId: process.env.PARLIAMENT_ROLE_ID || null,
  raid: {
    enabled: process.env.RAID_ENABLED === 'true',
    autoAction: process.env.RAID_AUTO_ACTION || 'mute',
    mentionThreshold: Number(process.env.RAID_MENTION_THRESHOLD || 5),
    joinThreshold: Number(process.env.RAID_JOIN_THRESHOLD || 4),
    messageThreshold: Number(process.env.RAID_MESSAGE_THRESHOLD || 6),
    intervalSeconds: Number(process.env.RAID_INTERVAL_SECONDS || 10)
  }
};
