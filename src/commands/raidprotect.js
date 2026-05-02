const { SlashCommandBuilder } = require('discord.js');
const raidProtect = require('../services/raidProtect');
const { createEmbed } = require('../services/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidprotect')
    .setDescription('Gère la protection anti-raid du serveur')
    .addSubcommand(sub => sub.setName('enable').setDescription('Active la protection anti-raid'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Désactive la protection anti-raid'))
    .addSubcommand(sub => sub.setName('config').setDescription('Affiche la configuration actuelle'))
    .addSubcommand(sub => sub
      .setName('logs-channel')
      .setDescription('Définit le salon des logs anti-raid')
      .addChannelOption(option => option.setName('channel').setDescription('Salon de logs').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('set')
      .setDescription('Met à jour les paramètres de RaidProtect')
      .addStringOption(option => option.setName('action').setDescription('Action automatique').setRequired(true).addChoices(
        { name: 'mute', value: 'mute' },
        { name: 'kick', value: 'kick' },
        { name: 'ban', value: 'ban' }
      ))
      .addIntegerOption(option => option.setName('mention').setDescription('Seuil de mention de masse').setRequired(false))
      .addIntegerOption(option => option.setName('messages').setDescription('Seuil de messages en intervalle').setRequired(false))
      .addIntegerOption(option => option.setName('joins').setDescription('Seuil d’arrivées massives').setRequired(false))
      .addIntegerOption(option => option.setName('interval').setDescription('Intervalle en secondes').setRequired(false)))
  ,
  async execute(interaction) {
    // Vérification des permissions : nécessite "Gérer le serveur"
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({
        content: '❌ Vous devez avoir la permission **"Gérer le serveur"** pour utiliser cette commande.',
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();
    const config = raidProtect.getConfig(interaction.guild.id);

    if (sub === 'enable' || sub === 'disable') {
      raidProtect.setConfig(interaction.guild.id, { enabled: sub === 'enable' ? 1 : 0 });
      return interaction.reply({ embeds: [createEmbed({ title: 'RaidProtect', description: `Protection anti-raid ${sub === 'enable' ? 'activée' : 'désactivée'}.`, color: 0x2ecc71 })] });
    }

    if (sub === 'logs-channel') {
      const channel = interaction.options.getChannel('channel');
      raidProtect.setConfig(interaction.guild.id, { logsChannelId: channel.id });
      return interaction.reply({ embeds: [createEmbed({ title: 'RaidProtect', description: `Salon des logs défini sur ${channel}.`, color: 0x3498db })] });
    }

    if (sub === 'set') {
      raidProtect.setConfig(interaction.guild.id, {
        action: interaction.options.getString('action'),
        mentionThreshold: interaction.options.getInteger('mention'),
        messageThreshold: interaction.options.getInteger('messages'),
        joinThreshold: interaction.options.getInteger('joins'),
        intervalSeconds: interaction.options.getInteger('interval')
      });
      return interaction.reply({ embeds: [createEmbed({ title: 'RaidProtect', description: 'Configuration enregistrée.', color: 0x3498db })] });
    }

    const rows = [
      { name: 'Activé', value: config.enabled ? 'Oui' : 'Non', inline: true },
      { name: 'Action', value: config.action, inline: true },
      { name: 'Mention seuil', value: String(config.mentionThreshold), inline: true },
      { name: 'Spam seuil', value: String(config.messageThreshold), inline: true },
      { name: 'Arrivées seuil', value: String(config.joinThreshold), inline: true },
      { name: 'Intervalle', value: `${config.intervalSeconds}s`, inline: true }
    ];

    interaction.reply({ embeds: [createEmbed({ title: 'RaidProtect — Configuration', fields: rows })] });
  }
};
