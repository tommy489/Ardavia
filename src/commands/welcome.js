const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const welcomeService = require('../services/welcomeService');

const COLOR  = 0x2ecc71;
const FOOTER = 'Ardavia Council • Welcome';

function parseColor(hex) {
  if (!hex) return COLOR;
  const parsed = parseInt(hex.replace('#', ''), 16);
  return isNaN(parsed) ? COLOR : parsed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Server welcome system')

    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Configure the welcome message')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('Channel to send the welcome message in')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
      )
      .addStringOption(o => o.setName('title').setDescription('Message title (variable: {server})').setRequired(true))
      .addStringOption(o => o
        .setName('description')
        .setDescription('Message body (variables: {user} {username} {server} {memberCount})')
        .setRequired(true)
      )
      .addStringOption(o => o.setName('color').setDescription('HEX colour (e.g. #2ecc71)'))
      .addStringOption(o => o.setName('image').setDescription('Banner image URL'))
    )
    .addSubcommand(sub => sub
      .setName('disable')
      .setDescription('Disable welcome messages')
    )
    .addSubcommand(sub => sub
      .setName('preview')
      .setDescription('Preview the current welcome message')
    )
    .addSubcommand(sub => sub
      .setName('autorole')
      .setDescription('Set the role automatically assigned to new members')
      .addRoleOption(o => o.setName('role').setDescription('Role to assign').setRequired(true))
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '⛔ Permission required: **Manage Server**.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const { guild, member } = interaction;

    // ── Setup ────────────────────────────────────────────────────────────────
    if (sub === 'setup') {
      const channel     = interaction.options.getChannel('channel');
      const title       = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const color       = parseColor(interaction.options.getString('color'));
      const imageUrl    = interaction.options.getString('image') || null;

      welcomeService.setConfig(guild.id, { channelId: channel.id, title, description, color, imageUrl, enabled: true });

      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('👋  Welcome System Configured')
        .addFields(
          { name: '📢 Channel',     value: channel.toString(), inline: true },
          { name: '🎨 Colour',      value: `#${color.toString(16).padStart(6, '0')}`, inline: true },
          { name: '🖼️ Image',      value: imageUrl ? '✅ Set' : '❌ None', inline: true },
          { name: '📋 Title',       value: title,       inline: false },
          { name: '📝 Description', value: description, inline: false }
        )
        .setFooter({ text: `${FOOTER} • Use /welcome preview to preview` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── Disable ───────────────────────────────────────────────────────────────
    if (sub === 'disable') {
      welcomeService.disable(guild.id);

      const embed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle('👋  Welcome Messages Disabled')
        .setDescription('No message will be sent when members join.')
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── Preview ───────────────────────────────────────────────────────────────
    if (sub === 'preview') {
      const cfg = welcomeService.getConfig(guild.id);
      if (!cfg) {
        return interaction.reply({ content: '⚠️ No configuration found. Use `/welcome setup` first.', ephemeral: true });
      }

      const fakeMember = Object.assign(Object.create(Object.getPrototypeOf(member)), member, {
        user: interaction.user,
        guild
      });

      const preview = welcomeService.buildEmbed(fakeMember, cfg);
      return interaction.reply({ embeds: [preview], ephemeral: true });
    }

    // ── Autorole ──────────────────────────────────────────────────────────────
    if (sub === 'autorole') {
      const role = interaction.options.getRole('role');
      welcomeService.setConfig(guild.id, { autoroleId: role.id });

      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('👋  Auto-Role Configured')
        .setDescription(`${role} will be automatically assigned to every new member.`)
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }
};
