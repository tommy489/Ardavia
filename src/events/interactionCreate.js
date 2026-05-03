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
        const msg = { content: '⚠️ Une erreur est survenue lors de l\'exécution de la commande.', ephemeral: true };
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
      const voteId = parseInt(parts[2], 10);
      const vote   = voteService.getOpenVote(voteId);

      if (!vote) {
        return interaction.reply({ content: '⛔ Ce vote est fermé ou introuvable.', ephemeral: true });
      }

      voteService.castVote(vote.id, interaction.user.id, target);
      const results = voteService.getResults(vote.id);

      const label   = target === 'yes' ? '✅ **POUR**' : '❌ **CONTRE**';
      const yesP    = results.total > 0 ? ((results.yes / results.total) * 100).toFixed(1) : '0.0';
      const noP     = results.total > 0 ? ((results.no  / results.total) * 100).toFixed(1) : '0.0';

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(target === 'yes' ? 0x2ecc71 : 0xe74c3c)
          .setTitle('🗳️  Vote enregistré')
          .setDescription(`Vous avez voté ${label}.`)
          .addFields(
            { name: '✅ Pour',   value: `${results.yes} (${yesP}%)`,  inline: true },
            { name: '❌ Contre', value: `${results.no} (${noP}%)`,    inline: true },
            { name: '👥 Total',  value: String(results.total),         inline: true }
          )
          .setFooter({ text: 'Ardavia Council • Gouvernement' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    // ── Ticket buttons ───────────────────────────────────────────────────────
    if (action === 'ticket') {

      // Create ticket (category from button)
      if (target === 'create') {
        const category = parts[2] || 'support';
        const panel    = ticketService.getPanel(interaction.guild.id);

        if (!panel) {
          return interaction.reply({ content: '⚠️ Le système de tickets n\'est pas configuré.', ephemeral: true });
        }

        // One open ticket per user (check by name prefix)
        const existing = interaction.guild.channels.cache.find(c =>
          c.name.startsWith(`ticket-${interaction.user.username.toLowerCase()}`) && c.type === ChannelType.GuildText
        );
        if (existing) {
          return interaction.reply({ content: `⚠️ Vous avez déjà un ticket ouvert : ${existing}`, ephemeral: true });
        }

        const meta    = ticketService.getCategoryMeta(category);
        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username.toLowerCase()}-${category}`,
          type: ChannelType.GuildText,
          topic: `Ticket ${meta.label} — ${interaction.user.tag}`,
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone.id, deny: ['ViewChannel'] },
            { id: interaction.user.id,  allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
            { id: panel.staffRoleId,    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'] }
          ]
        });

        ticketService.createTicket(interaction.guild.id, interaction.user.id, channel.id, category);

        await interaction.reply({ content: `✅ Ticket créé : ${channel}`, ephemeral: true });

        const ticketEmbed = new EmbedBuilder()
          .setColor(meta.color)
          .setTitle(`🎫  ${meta.label}`)
          .setDescription('Un membre du staff va vous assister sous peu.\nDécrivez votre demande ci-dessous.')
          .addFields(
            { name: '👤 Ouvert par', value: interaction.user.toString(), inline: true },
            { name: '📂 Catégorie',  value: meta.label,                  inline: true },
            { name: '🕐 Créé le',    value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
          )
          .setFooter({ text: 'Ardavia Council • Tickets' })
          .setTimestamp();

        const ticketRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket:close').setLabel('🔒 Fermer le ticket').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket:claim').setLabel('✋ Prendre en charge').setStyle(ButtonStyle.Secondary)
        );

        const msg = await channel.send({ content: `<@${interaction.user.id}> <@&${panel.staffRoleId}>`, embeds: [ticketEmbed], components: [ticketRow] });
        ticketService.setOpenMessage(interaction.guild.id, channel.id, msg.id);
        return;
      }

      // Close ticket
      if (target === 'close') {
        const ticket = ticketService.getByChannel(interaction.guild.id, interaction.channel.id);
        if (!ticket || ticket.status === 'closed') {
          return interaction.reply({ content: '⚠️ Ce salon n\'est pas un ticket actif.', ephemeral: true });
        }

        const isStaff   = interaction.member.permissions.has('ManageChannels');
        const isOwner   = interaction.user.id === ticket.userId;
        if (!isStaff && !isOwner) {
          return interaction.reply({ content: '⛔ Seul le créateur ou un membre du staff peut fermer ce ticket.', ephemeral: true });
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
                .setTitle('🎫  Ticket Clôturé')
                .addFields(
                  { name: '📂 Catégorie',  value: meta.label,                    inline: true },
                  { name: '👤 Ouvert par', value: `<@${ticket.userId}>`,          inline: true },
                  { name: '🔒 Fermé par',  value: interaction.user.toString(),     inline: true },
                  { name: '🕐 Créé le',    value: `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:f>`, inline: false }
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
            .setTitle('🔒  Ticket Fermé')
            .setDescription(`Ce ticket a été fermé par ${interaction.user}.\nLe salon sera supprimé dans **5 secondes**.`)
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
          return interaction.reply({ content: '⚠️ Ce salon n\'est pas un ticket actif.', ephemeral: true });
        }
        if (ticket.claimedBy) {
          return interaction.reply({ content: `⚠️ Ce ticket est déjà pris en charge par <@${ticket.claimedBy}>.`, ephemeral: true });
        }

        ticketService.claimTicket(interaction.guild.id, interaction.channel.id, interaction.user.id);

        // Update the open message to disable claim button
        if (ticket.openMessageId) {
          try {
            const msg = await interaction.channel.messages.fetch(ticket.openMessageId);
            const updatedRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('ticket:close').setLabel('🔒 Fermer le ticket').setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId('ticket:claim').setLabel(`✋ Pris par ${interaction.user.username}`).setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
            await msg.edit({ components: [updatedRow] });
          } catch (_) {}
        }

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x2ecc71)
            .setDescription(`✅ ${interaction.user} a pris en charge ce ticket.`)
            .setFooter({ text: 'Ardavia Council • Tickets' })
            .setTimestamp()
          ]
        });
      }
    }

    // ── Help navigation buttons ──────────────────────────────────────────────
    if (action === 'help') {
      const page = PAGES[target] ? PAGES[target]() : PAGES.menu();
      return interaction.update({ embeds: [page.embed], components: [page.row] });
    }
  }
};
