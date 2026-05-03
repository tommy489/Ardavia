const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const welcomeService = require('../services/welcomeService');

const COLOR  = 0x2ecc71;
const FOOTER = 'Ardavia Council • Bienvenue';

function parseColor(hex) {
  if (!hex) return COLOR;
  const cleaned = hex.replace('#', '');
  const parsed  = parseInt(cleaned, 16);
  return isNaN(parsed) ? COLOR : parsed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Système de bienvenue du serveur Ardavia')

    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Configure le message de bienvenue')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('Salon où envoyer le message de bienvenue')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
      )
      .addStringOption(o => o.setName('title').setDescription('Titre du message (variable : {server})').setRequired(true))
      .addStringOption(o => o
        .setName('description')
        .setDescription('Corps du message (variables : {user} {username} {server} {memberCount})')
        .setRequired(true)
      )
      .addStringOption(o => o.setName('color').setDescription('Couleur HEX (ex: #2ecc71)'))
      .addStringOption(o => o.setName('image').setDescription('URL de l\'image de bannière'))
    )

    .addSubcommand(sub => sub
      .setName('disable')
      .setDescription('Désactive les messages de bienvenue')
    )

    .addSubcommand(sub => sub
      .setName('preview')
      .setDescription('Affiche un aperçu du message de bienvenue')
    )

    .addSubcommand(sub => sub
      .setName('autorole')
      .setDescription('Configure le rôle automatiquement attribué à l\'arrivée')
      .addRoleOption(o => o.setName('role').setDescription('Rôle à attribuer').setRequired(true))
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({
        content: '⛔ Permission requise : **Gérer le serveur**.',
        ephemeral: true
      });
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
        .setTitle('👋  Bienvenue configuré')
        .addFields(
          { name: '📢 Salon',       value: channel.toString(),    inline: true },
          { name: '🎨 Couleur',     value: `#${color.toString(16).padStart(6, '0')}`, inline: true },
          { name: '🖼️ Image',      value: imageUrl ? '✅ Définie' : '❌ Aucune',       inline: true },
          { name: '📋 Titre',       value: title,                 inline: false },
          { name: '📝 Description', value: description,           inline: false }
        )
        .setFooter({ text: `${FOOTER} • Utilisez /welcome preview pour prévisualiser` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── Disable ──────────────────────────────────────────────────────────────
    if (sub === 'disable') {
      welcomeService.disable(guild.id);

      const embed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle('👋  Messages de bienvenue désactivés')
        .setDescription('Aucun message ne sera envoyé lors des prochaines arrivées.')
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── Preview ───────────────────────────────────────────────────────────────
    if (sub === 'preview') {
      const cfg = welcomeService.getConfig(guild.id);
      if (!cfg) {
        return interaction.reply({
          content: '⚠️ Aucune configuration trouvée. Utilisez `/welcome setup` d\'abord.',
          ephemeral: true
        });
      }

      const fakeMember = Object.assign(Object.create(Object.getPrototypeOf(member)), member, {
        user: interaction.user,
        guild
      });

      const preview = welcomeService.buildEmbed(fakeMember, cfg);
      return interaction.reply({ embeds: [preview], ephemeral: true });
    }

    // ── Autorole ─────────────────────────────────────────────────────────────
    if (sub === 'autorole') {
      const role = interaction.options.getRole('role');
      welcomeService.setConfig(guild.id, { autoroleId: role.id });

      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('👋  Autorole configuré')
        .setDescription(`Le rôle ${role} sera automatiquement attribué à chaque nouveau membre.`)
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }
};
