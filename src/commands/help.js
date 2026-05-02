const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../services/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche l’aide immersive du Council'),
  async execute(interaction) {
    const embed = createEmbed({
      title: 'Ardavia Council • Aide',
      description: 'Choisissez une catégorie pour voir les commandes disponibles.',
      fields: [
        { name: 'RP', value: '/rp balance, /rp pay, /bank, /vote', inline: true },
        { name: 'HRP', value: '/hrp add-money, /hrp remove-money, /set-currency, /raidprotect', inline: true },
        { name: 'Gouvernement', value: '/set-parliament-role, /vote create, /vote end, /vote results', inline: true }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help:rp').setLabel('RP').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('help:hrp').setLabel('HRP').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help:gov').setLabel('Gouvernement').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('help:eco').setLabel('Économie').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help:mod').setLabel('Modération').setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
};
