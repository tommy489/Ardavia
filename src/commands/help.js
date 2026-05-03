const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const FOOTER = 'Ardavia Council • Command Centre';

const PAGES = {
  menu: () => ({
    embed: new EmbedBuilder()
      .setColor(0x1862a6)
      .setTitle('🏛️  ARDAVIA COUNCIL — Command Centre')
      .setDescription(
        'Welcome to the official Ardavia Council control panel.\n' +
        'Select a category to view available commands.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      )
      .addFields(
        { name: '🏛️  Government', value: 'Votes, laws, parliament roles',           inline: false },
        { name: '🛡️  Security',   value: 'Anti-spam, anti-raid, whitelist, logs',   inline: false },
        { name: '🎫  Tickets',    value: 'Support, reports, official requests',     inline: false },
        { name: '👋  Welcome',    value: 'Welcome messages, auto-roles',            inline: false }
      )
      .setFooter({ text: FOOTER })
      .setTimestamp(),
    row: new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help:gov').setLabel('🏛️ Government').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help:security').setLabel('🛡️ Security').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('help:ticket').setLabel('🎫 Tickets').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('help:welcome').setLabel('👋 Welcome').setStyle(ButtonStyle.Success)
    )
  }),

  gov: () => ({
    embed: new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🏛️  Government — Official Commands')
      .setDescription('Manage votes, laws and parliament roles.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      .addFields(
        {
          name: '📊 Votes',
          value:
            '`/gov vote create` — Submit an official vote to parliament\n' +
            '`/gov vote end` — Close a vote and publish the verdict\n' +
            '`/gov vote results` — Check live results of a vote',
          inline: false
        },
        {
          name: '⚖️ Parliament',
          value: '`/gov parliament-role set` — Authorise a role to use parliament commands',
          inline: false
        },
        {
          name: '📜 Laws',
          value:
            '`/gov law create` — Enact a new official law\n' +
            '`/gov law list` — Display the full law registry',
          inline: false
        }
      )
      .setFooter({ text: FOOTER })
      .setTimestamp(),
    row: backRow()
  }),

  security: () => ({
    embed: new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('🛡️  Security — Protection Commands')
      .setDescription('Protect the server against spam, raids, bots and mass-mentions.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      .addFields(
        {
          name: '🔘 Toggle',
          value:
            '`/security enable` — Enable the security system\n' +
            '`/security disable` — Disable the security system\n' +
            '`/security status` — Display the full configuration',
          inline: false
        },
        {
          name: '⚙️ Configuration',
          value:
            '`/security config [protection]` — Configure anti-spam / anti-raid / anti-mention / anti-bot\n' +
            '`/security logs [channel]` — Set the security log channel',
          inline: false
        },
        {
          name: '🤍 Whitelist',
          value: '`/security whitelist-role [role] [add/remove]` — Roles exempt from all detections',
          inline: false
        }
      )
      .setFooter({ text: FOOTER })
      .setTimestamp(),
    row: backRow()
  }),

  ticket: () => ({
    embed: new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🎫  Tickets — Support Commands')
      .setDescription('Multi-category ticket system for staff.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      .addFields(
        {
          name: '🔧 Setup',
          value:
            '`/ticket setup [staff] [logs]` — Configure the staff role and log channel\n' +
            '`/ticket panel` — Post the ticket panel in this channel',
          inline: false
        },
        {
          name: '🎫 Management (inside a ticket)',
          value:
            '`/ticket close` — Close and delete this ticket\n' +
            '`/ticket add-user [@user]` — Add a user to this ticket\n' +
            '`/ticket remove-user [@user]` — Remove a user from this ticket',
          inline: false
        },
        {
          name: '📂 Available categories',
          value: '🆘 **Support** • 🚨 **Report** • 🏛️ **Government**',
          inline: false
        }
      )
      .setFooter({ text: FOOTER })
      .setTimestamp(),
    row: backRow()
  }),

  welcome: () => ({
    embed: new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('👋  Welcome — Greeting Commands')
      .setDescription('Configure automatic greetings for new members.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      .addFields(
        {
          name: '⚙️ Configuration',
          value:
            '`/welcome setup [channel] [title] [description]` — Configure the welcome message\n' +
            '`/welcome disable` — Disable welcome messages',
          inline: false
        },
        {
          name: '👁️ Preview',
          value: '`/welcome preview` — Preview the current welcome message',
          inline: false
        },
        {
          name: '🎭 Auto-Role',
          value: '`/welcome autorole [role]` — Set the role automatically assigned on join',
          inline: false
        },
        {
          name: '📝 Available variables',
          value: '`{user}` `{username}` `{server}` `{memberCount}`',
          inline: false
        }
      )
      .setFooter({ text: FOOTER })
      .setTimestamp(),
    row: backRow()
  })
};

function backRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('help:menu').setLabel('↩️  Back to menu').setStyle(ButtonStyle.Secondary)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display the Ardavia Council command panel'),

  async execute(interaction) {
    const page = PAGES.menu();
    await interaction.reply({ embeds: [page.embed], components: [page.row], ephemeral: true });
  },

  PAGES
};
