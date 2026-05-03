const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const FOOTER = 'Ardavia Council • Centre de Commandes';

// ── Page definitions ─────────────────────────────────────────────────────────

const PAGES = {
  menu: () => ({
    embed: new EmbedBuilder()
      .setColor(0x1862a6)
      .setTitle('🏛️  ARDAVIA COUNCIL — Centre de Commandes')
      .setDescription(
        'Bienvenue dans le panneau de contrôle officiel du Conseil d\'Ardavia.\n' +
        'Sélectionnez une catégorie pour afficher les commandes disponibles.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      )
      .addFields(
        { name: '🏛️  Gouvernement', value: 'Votes, lois, rôles parlementaires',           inline: false },
        { name: '🛡️  Sécurité',     value: 'Anti-spam, anti-raid, whitelist, logs',        inline: false },
        { name: '🎫  Tickets',      value: 'Support, signalements, demandes officielles',  inline: false },
        { name: '👋  Bienvenue',    value: 'Messages d\'accueil, rôles automatiques',      inline: false }
      )
      .setFooter({ text: FOOTER })
      .setTimestamp(),
    row: new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help:gov').setLabel('🏛️ Gouvernement').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help:security').setLabel('🛡️ Sécurité').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('help:ticket').setLabel('🎫 Tickets').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('help:welcome').setLabel('👋 Bienvenue').setStyle(ButtonStyle.Success)
    )
  }),

  gov: () => ({
    embed: new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🏛️  Gouvernement — Commandes Officielles')
      .setDescription('Gestion des votes, lois et rôles du Parlement d\'Ardavia.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      .addFields(
        {
          name: '📊 Votes',
          value:
            '`/gov vote create` — Soumet un vote officiel au parlement\n' +
            '`/gov vote end` — Clôture un vote et publie le verdict\n' +
            '`/gov vote results` — Consulte les résultats en temps réel',
          inline: false
        },
        {
          name: '⚖️ Parlement',
          value: '`/gov parliament-role set` — Définit le rôle parlementaire autorisé',
          inline: false
        },
        {
          name: '📜 Lois',
          value:
            '`/gov law create` — Promulgue une nouvelle loi officielle\n' +
            '`/gov law list` — Affiche le registre complet des lois en vigueur',
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
      .setTitle('🛡️  Sécurité — Commandes de Protection')
      .setDescription('Protège le serveur contre spam, raids, bots et mentions massives.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      .addFields(
        {
          name: '🔘 Activation',
          value:
            '`/security enable` — Active le système de sécurité\n' +
            '`/security disable` — Désactive le système de sécurité\n' +
            '`/security status` — Affiche la configuration complète',
          inline: false
        },
        {
          name: '⚙️ Configuration',
          value:
            '`/security config [protection]` — Configure anti-spam / anti-raid / anti-mention / anti-bot\n' +
            '`/security logs [salon]` — Définit le salon de logs de sécurité',
          inline: false
        },
        {
          name: '🤍 Liste Blanche',
          value: '`/security whitelist-role [rôle] [add/remove]` — Rôles immunisés contre les détections',
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
      .setTitle('🎫  Tickets — Commandes de Support')
      .setDescription('Système de tickets multi-catégories pour le staff.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      .addFields(
        {
          name: '🔧 Configuration',
          value:
            '`/ticket setup [staff] [logs]` — Configure le rôle staff et le salon de logs\n' +
            '`/ticket panel` — Publie le panneau de tickets dans ce salon',
          inline: false
        },
        {
          name: '🎫 Gestion (dans un ticket)',
          value:
            '`/ticket close` — Ferme et supprime ce ticket\n' +
            '`/ticket add-user [@user]` — Ajoute un utilisateur à ce ticket\n' +
            '`/ticket remove-user [@user]` — Retire un utilisateur de ce ticket',
          inline: false
        },
        {
          name: '📂 Catégories disponibles',
          value: '🆘 **Support** • 🚨 **Signalement** • 🏛️ **Gouvernement**',
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
      .setTitle('👋  Bienvenue — Commandes d\'Accueil')
      .setDescription('Configure l\'accueil automatique des nouveaux membres.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      .addFields(
        {
          name: '⚙️ Configuration',
          value:
            '`/welcome setup [salon] [titre] [description]` — Configure le message de bienvenue\n' +
            '`/welcome disable` — Désactive les messages de bienvenue',
          inline: false
        },
        {
          name: '👁️ Prévisualisation',
          value: '`/welcome preview` — Affiche un aperçu du message de bienvenue actuel',
          inline: false
        },
        {
          name: '🎭 Autorole',
          value: '`/welcome autorole [rôle]` — Définit le rôle attribué automatiquement à l\'arrivée',
          inline: false
        },
        {
          name: '📝 Variables disponibles',
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
    new ButtonBuilder().setCustomId('help:menu').setLabel('↩️  Retour au menu').setStyle(ButtonStyle.Secondary)
  );
}

// ── Export ───────────────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche le panneau de commandes Ardavia Council'),

  async execute(interaction) {
    const page = PAGES.menu();
    await interaction.reply({ embeds: [page.embed], components: [page.row], ephemeral: true });
  },

  PAGES
};
