const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const voteService   = require('../services/voteService');
const ticketService = require('../services/ticketService');
const { PAGES }     = require('../commands/help');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {

    // ── Slash commands ───────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (error) {
        client.logger.error('Command error:', error);
        const msg = { content: '⚠️ An error occurred while executing this command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
      return;
    }

    if (!interaction.isButton()) return;

    const parts  = interaction.customId.split(':');
    const action = parts[0];
    const target = parts[1];

    // ── Vote buttons ─────────────────────────────────────────────────────────
    if (action === 'vote' && (target === 'yes' || target === 'no')) {
      const voteId  = parseInt(parts[2], 10);
      const vote    = voteService.getOpenVote(voteId);

      if (!vote) {
        return interaction.reply({ content: '⛔ This vote is closed or not found.', ephemeral: true });
      }

      voteService.castVote(vote.id, interaction.user.id, target);
      const results = voteService.getResults(vote.id);

      const label  = target === 'yes' ? '✅ **IN FAVOUR**' : '❌ **AGAINST**';
      const yesP   = results.total > 0 ? ((results.yes / results.total) * 100).toFixed(1) : '0.0';
      const noP    = results.total > 0 ? ((results.no  / results.total) * 100).toFixed(1) : '0.0';

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(target === 'yes' ? 0x2ecc71 : 0xe74c3c)
          .setTitle('🗳️  Vote Recorded')
          .setDescription(`You voted ${label}.`)
          .addFields(
            { name: '✅ In favour', value: `${results.yes} (${yesP}%)`, inline: true },
            { name: '❌ Against',   value: `${results.no} (${noP}%)`,   inline: true },
            { name: '👥 Total',     value: String(results.total),        inline: true }
          )
          .setFooter({ text: 'Ardavia Council • Government' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    // ── Ticket buttons ───────────────────────────────────────────────────────
    if (action === 'ticket') {

      // Create ticket
      if (target === 'create') {
        const category = parts[2] || 'support';
        const panel    = ticketService.getPanel(interaction.guild.id);

        if (!panel) {
          return interaction.reply({ content: '⚠️ The ticket system is not configured.', ephemeral: true });
        }

        const existing = interaction.guild.channels.cache.find(c =>
          c.name.startsWith(`ticket-${interaction.user.username.toLowerCase()}`) && c.type === ChannelType.GuildText
        );
        if (existing) {
          return interaction.reply({ content: `⚠️ You already have an open ticket: ${existing}`, ephemeral: true });
        }

        const meta    = ticketService.getCategoryMeta(category);
        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username.toLowerCase()}-${category}`,
          type: ChannelType.GuildText,
          topic: `${meta.label} ticket — ${interaction.user.tag}`,
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone.id, deny: ['ViewChannel'] },
            { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
            { id: panel.staffRoleId,   allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'] }
          ]
        });

        ticketService.createTicket(interaction.guild.id, interaction.user.id, channel.id, category);

        await interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });

        const ticketEmbed = new EmbedBuilder()
          .setColor(meta.color)
          .setTitle(`🎫  ${meta.label}`)
          .setDescription('A staff member will assist you shortly.\nDescribe your request below.')
          .addFields(
            { name: '👤 Opened by', value: interaction.user.toString(), inline: true },
            { name: '📂 Category',  value: meta.label,                  inline: true },
            { name: '🕐 Created',   value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
          )
          .setFooter({ text: 'Ardavia Council • Tickets' })
          .setTimestamp();

        const ticketRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket:close').setLabel('🔒 Close ticket').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket:claim').setLabel('✋ Claim ticket').setStyle(ButtonStyle.Secondary)
        );

        const msg = await channel.send({
          content: `<@${interaction.user.id}> <@&${panel.staffRoleId}>`,
          embeds: [ticketEmbed],
          components: [ticketRow]
        });
        ticketService.setOpenMessage(interaction.guild.id, channel.id, msg.id);
        return;
      }

      // Close ticket
      if (target === 'close') {
        const ticket = ticketService.getByChannel(interaction.guild.id, interaction.channel.id);
        if (!ticket || ticket.status === 'closed') {
          return interaction.reply({ content: '⚠️ This channel is not an active ticket.', ephemeral: true });
        }

        const isStaff = interaction.member.permissions.has('ManageChannels');
        const isOwner = interaction.user.id === ticket.userId;
        if (!isStaff && !isOwner) {
          return interaction.reply({ content: '⛔ Only the ticket creator or staff can close this ticket.', ephemeral: true });
        }

        ticketService.closeTicket(interaction.guild.id, interaction.channel.id);

        const panel = ticketService.getPanel(interaction.guild.id);
        const meta  = ticketService.getCategoryMeta(ticket.category);

        if (panel?.logChannelId) {
          const logCh = interaction.guild.channels.cache.get(panel.logChannelId);
          if (logCh) {
            await logCh.send({
              embeds: [new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('🎫  Ticket Closed')
                .addFields(
                  { name: '📂 Category',  value: meta.label,                     inline: true },
                  { name: '👤 Opened by', value: `<@${ticket.userId}>`,           inline: true },
                  { name: '🔒 Closed by', value: interaction.user.toString(),      inline: true },
                  { name: '🕐 Created',   value: `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:f>`, inline: false }
                )
                .setFooter({ text: 'Ardavia Council • Tickets' })
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
            .setFooter({ text: 'Ardavia Council • Tickets' })
            .setTimestamp()
          ]
        });

        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        return;
      }

      // Claim ticket
      if (target === 'claim') {
        const ticket = ticketService.getByChannel(interaction.guild.id, interaction.channel.id);
        if (!ticket || ticket.status === 'closed') {
          return interaction.reply({ content: '⚠️ This channel is not an active ticket.', ephemeral: true });
        }
        if (ticket.claimedBy) {
          return interaction.reply({ content: `⚠️ This ticket is already claimed by <@${ticket.claimedBy}>.`, ephemeral: true });
        }

        ticketService.claimTicket(interaction.guild.id, interaction.channel.id, interaction.user.id);

        if (ticket.openMessageId) {
          try {
            const msg = await interaction.channel.messages.fetch(ticket.openMessageId);
            const updatedRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('ticket:close').setLabel('🔒 Close ticket').setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId('ticket:claim').setLabel(`✋ Claimed by ${interaction.user.username}`).setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
            await msg.edit({ components: [updatedRow] });
          } catch (_) {}
        }

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x2ecc71)
            .setDescription(`✅ ${interaction.user} has claimed this ticket.`)
            .setFooter({ text: 'Ardavia Council • Tickets' })
            .setTimestamp()
          ]
        });
      }
    }

    // ── Help navigation ──────────────────────────────────────────────────────
    if (action === 'help') {
      const page = PAGES[target] ? PAGES[target]() : PAGES.menu();
      return interaction.update({ embeds: [page.embed], components: [page.row] });
    }
  }
};
