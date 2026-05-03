const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const ticketService = require('../services/ticketService');

const COLOR  = 0x3498db;
const FOOTER = 'Ardavia Council • Tickets';

function buildPanelEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle('🎫  ARDAVIA COUNCIL — Centre de Tickets')
    .setDescription(
      'Besoin d\'aide ou de contacter le staff ?\n' +
      'Sélectionnez la catégorie correspondant à votre demande.\n\n' +
      '🆘 **Support** — Questions générales, aide technique\n' +
      '🚨 **Signalement** — Signaler un comportement inapproprié\n' +
      '🏛️ **Gouvernement** — Demandes officielles au Parlement'
    )
    .setFooter({ text: FOOTER })
    .setTimestamp();
}

function buildPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:create:support').setLabel('🆘 Support').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket:create:report').setLabel('🚨 Signalement').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket:create:government').setLabel('🏛️ Gouvernement').setStyle(ButtonStyle.Success)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Système de tickets du staff Ardavia')

    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Configure le système de tickets (rôle staff + logs)')
      .addRoleOption(o => o.setName('staff').setDescription('Rôle du staff').setRequired(true))
      .addChannelOption(o => o
        .setName('logs')
        .setDescription('Salon de logs des tickets fermés (optionnel)')
        .addChannelTypes(ChannelType.GuildText)
      )
    )

    .addSubcommand(sub => sub
      .setName('panel')
      .setDescription('Publie le panneau de création de tickets dans ce salon')
    )

    .addSubcommand(sub => sub
      .setName('close')
      .setDescription('Ferme le ticket dans ce salon')
    )

    .addSubcommand(sub => sub
      .setName('add-user')
      .setDescription('Ajoute un utilisateur au ticket actif')
      .addUserOption(o => o.setName('user').setDescription('Utilisateur à ajouter').setRequired(true))
    )

    .addSubcommand(sub => sub
      .setName('remove-user')
      .setDescription('Retire un utilisateur du ticket actif')
      .addUserOption(o => o.setName('user').setDescription('Utilisateur à retirer').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const { guild, channel, member } = interaction;

    // ── Setup ────────────────────────────────────────────────────────────────
    if (sub === 'setup') {
      if (!member.permissions.has('ManageChannels')) {
        return interaction.reply({ content: '⛔ Permission requise : **Gérer les salons**.', ephemeral: true });
      }

      const staffRole   = interaction.options.getRole('staff');
      const logChannel  = interaction.options.getChannel('logs');

      ticketService.setPanel(guild.id, channel.id, null, staffRole.id, logChannel?.id ?? null);

      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('🎫  Système de Tickets configuré')
        .addFields(
          { name: '👮 Rôle Staff', value: staffRole.toString(),                                      inline: true },
          { name: '📋 Logs',       value: logChannel ? logChannel.toString() : 'Non configuré',       inline: true }
        )
        .setDescription('Utilisez `/ticket panel` pour publier le panneau dans le salon de votre choix.')
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── Panel ─────────────────────────────────────────────────────────────────
    if (sub === 'panel') {
      if (!member.permissions.has('ManageChannels')) {
        return interaction.reply({ content: '⛔ Permission requise : **Gérer les salons**.', ephemeral: true });
      }

      const panel = ticketService.getPanel(guild.id);
      if (!panel) {
        return interaction.reply({ content: '⚠️ Système de tickets non configuré. Utilisez `/ticket setup` d\'abord.', ephemeral: true });
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
        return interaction.reply({ content: '⚠️ Ce salon n\'est pas un ticket actif.', ephemeral: true });
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
              .setTitle('🎫  Ticket Clôturé')
              .addFields(
                { name: '📂 Catégorie',  value: meta.label,             inline: true },
                { name: '👤 Ouvert par', value: `<@${ticket.userId}>`,  inline: true },
                { name: '🔒 Fermé par',  value: interaction.user.toString(), inline: true },
                { name: '🕐 Créé le',    value: `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:f>`, inline: false }
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
          .setTitle('🔒  Ticket Fermé')
          .setDescription(`Ce ticket a été fermé par ${interaction.user}.\nLe salon sera supprimé dans **5 secondes**.`)
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
        return interaction.reply({ content: '⚠️ Ce salon n\'est pas un ticket actif.', ephemeral: true });
      }

      const target = interaction.options.getUser('user');
      await channel.permissionOverwrites.create(target, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLOR)
          .setDescription(`✅ ${target} a été **ajouté** à ce ticket.`)
          .setFooter({ text: FOOTER })
          .setTimestamp()
        ]
      });
    }

    // ── Remove-user ───────────────────────────────────────────────────────────
    if (sub === 'remove-user') {
      const ticket = ticketService.getByChannel(guild.id, channel.id);
      if (!ticket || ticket.status === 'closed') {
        return interaction.reply({ content: '⚠️ Ce salon n\'est pas un ticket actif.', ephemeral: true });
      }

      const target = interaction.options.getUser('user');
      if (target.id === ticket.userId) {
        return interaction.reply({ content: '⚠️ Impossible de retirer le créateur du ticket.', ephemeral: true });
      }

      await channel.permissionOverwrites.delete(target).catch(() => {});

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLOR)
          .setDescription(`✅ ${target} a été **retiré** de ce ticket.`)
          .setFooter({ text: FOOTER })
          .setTimestamp()
        ]
      });
    }
  }
};
