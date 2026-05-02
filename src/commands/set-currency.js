const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../services/embed');
const economyService = require('../services/economyService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-currency')
    .setDescription('Définit la monnaie RP du serveur')
    .addStringOption(option => option.setName('name').setDescription('Nom de la monnaie').setRequired(true)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: 'Permission requise : gérer le serveur.', ephemeral: true });
    }
    const name = interaction.options.getString('name');
    economyService.setCurrency(interaction.guild.id, name);
    await interaction.reply({ embeds: [createEmbed({ title: 'Économie', description: `Monnaie RP définie sur **${name}**.`, color: 0x2ecc71 })] });
  }
};
