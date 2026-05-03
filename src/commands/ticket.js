const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const ticketService = require('../services/ticketService');

const COLOR  = 0x3498db;
const FOOTER = 'Ardavia Council • Tickets';

function buildPanelEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle('🎫  ARDAVIA COUNCIL — Ticket Centre')
    .setDescription(
      'Need help or want to contact staff?\n' +
      'Select the category that matches your request.\n\n' +
      '🆘 **Support** — General questions, technical help\n' +
      '🚨 **Report** — Report inappropriate behaviour\n' +
      '🏛️ **Government** — Official requests to Parliament'
    )
    .setFooter({ text: FOOTER })
    .setTimestamp();
}

function buildPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:create:support').setLabel('🆘 Support').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket:create:report').setLabel('🚨 Report').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket:create:government').setLabel('🏛️ Government').setStyle(ButtonStyle.Success)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ardavia staff ticket system')

    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Configure the ticket system (staff role + logs)')
      .addRoleOption(o => o.setName('staff').setDescription('Staff role').setRequired(true))
      .addChannelOption(o => o
        .setName('logs')
        .setDescription('Log channel for closed tickets (optional)')
        .addChannelTypes(ChannelType.GuildText)
      )
    )
    .addSubcommand(sub => sub
      .setName('panel')
      .setDescription('Post the ticket panel in this channel')
    )
    .addSubcommand(sub => sub
      .setName('close')
      .setDescription('Close the ticket in this channel')
    )
    .addSubcommand(sub => sub
      .setName('add-user')
      .setDescription('Add a user to the active ticket')
      .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('remove-user')
      .setDescription('Remove a user from the active ticket')
      .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const { guild, channel, member } = interaction;

    // ── Setup ────────────────────────────────────────────────────────────────
    if (sub === 'setup') {
      if (!member.permissions.has('ManageChannels')) {
        return interaction.reply({ content: '⛔ Permission required: **Manage Channels**.', ephemeral: true });
      }

      const staffRole  = interaction.options.getRole('staff');
      const logChannel = interaction.options.getChannel('logs');

      ticketService.setPanel(guild.id, channel.id, null, staffRole.id, logChannel?.id ?? null);

      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('🎫  Ticket System Configured')
        .addFields(
          { name: '👮 Staff Role', value: staffRole.toString(),                                      inline: true },
          { name: '📋 Logs',       value: logChannel ? logChannel.toString() : 'Not configured',     inline: true }
        )
        .setDescription('Use `/ticket panel` to publish the panel in your desired channel.')
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── Panel ─────────────────────────────────────────────────────────────────
    if (sub === 'panel') {
      if (!member.permissions.has('ManageChannels')) {
        return interaction.reply({ content: '⛔ Permission required: **Manage Channels**.', ephemeral: true });
      }

      const panel = ticketService.getPanel(guild.id);
      if (!panel) {
        return interaction.reply({ content: '⚠️ Ticket system not configured. Use `/ticket setup` first.', ephemeral: true });
      }

      const msg = await interaction.reply({
        embeds: [buildPanelEmbed()],
        components: [buildPanelRow()],
        fetchReply: true
      });

      ticketService.setPanel(guild.id, channel.id, msg.id, panel.staffRoleId, panel.logChannelId);
      return;
    }

    // ── Close ─────────────────────────────────────────────────────────────────
    if (sub === 'close') {
      const ticket = ticketService.getByChannel(guild.id, channel.id);
      if (!ticket || ticket.status === 'closed') {
        return interaction.reply({ content: '⚠️ This channel is not an active ticket.', ephemeral: true });
      }

      ticketService.closeTicket(guild.id, channel.id);

      const panel = ticketService.getPanel(guild.id);
      const meta  = ticketService.getCategoryMeta(ticket.category);

      if (panel?.logChannelId) {
        const logCh = guild.channels.cache.get(panel.logChannelId);
        if (logCh) {
          await logCh.send({
            embeds: [new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle('🎫  Ticket Closed')
              .addFields(
                { name: '📂 Category',   value: meta.label,                      inline: true },
                { name: '👤 Opened by',  value: `<@${ticket.userId}>`,            inline: true },
                { name: '🔒 Closed by',  value: interaction.user.toString(),       inline: true },
                { name: '🕐 Created',    value: `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:f>`, inline: false }
              )
              .setFooter({ text: FOOTER })
              .setTimestamp()
            ]
          }).catch(() => {});
        }
      }

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('🔒  Ticket Closed')
          .setDescription(`This ticket was closed by ${interaction.user}.\nThe channel will be deleted in **5 seconds**.`)
          .setFooter({ text: FOOTER })
          .setTimestamp()
        ]
      });

      setTimeout(() => channel.delete().catch(() => {}), 5000);
      return;
    }

    // ── Add-user ──────────────────────────────────────────────────────────────
    if (sub === 'add-user') {
      const ticket = ticketService.getByChannel(guild.id, channel.id);
      if (!ticket || ticket.status === 'closed') {
        return interaction.reply({ content: '⚠️ This channel is not an active ticket.', ephemeral: true });
      }

      const target = interaction.options.getUser('user');
      await channel.permissionOverwrites.create(target, {
        ViewChannel: true, SendMessages: true, ReadMessageHistory: true
      });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLOR)
          .setDescription(`✅ ${target} has been **added** to this ticket.`)
          .setFooter({ text: FOOTER })
          .setTimestamp()
        ]
      });
    }

    // ── Remove-user ───────────────────────────────────────────────────────────
    if (sub === 'remove-user') {
      const ticket = ticketService.getByChannel(guild.id, channel.id);
      if (!ticket || ticket.status === 'closed') {
        return interaction.reply({ content: '⚠️ This channel is not an active ticket.', ephemeral: true });
      }

      const target = interaction.options.getUser('user');
      if (target.id === ticket.userId) {
        return interaction.reply({ content: '⚠️ Cannot remove the ticket creator.', ephemeral: true });
      }

      await channel.permissionOverwrites.delete(target).catch(() => {});

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLOR)
          .setDescription(`✅ ${target} has been **removed** from this ticket.`)
          .setFooter({ text: FOOTER })
          .setTimestamp()
        ]
      });
    }
  }
};
