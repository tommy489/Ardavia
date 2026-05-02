const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../services/embed');
const economyService = require('../services/economyService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hrp')
    .setDescription('Commandes HRP administratives')
    .addSubcommand(sub => sub
      .setName('add-money')
      .setDescription('Ajoute des crédits à un joueur')
      .addUserOption(option => option.setName('target').setDescription('Cible').setRequired(true))
      .addIntegerOption(option => option.setName('amount').setDescription('Montant').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('remove-money')
      .setDescription('Retire des crédits à un joueur')
      .addUserOption(option => option.setName('target').setDescription('Cible').setRequired(true))
      .addIntegerOption(option => option.setName('amount').setDescription('Montant').setRequired(true))),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: 'Permission requise : gérer le serveur.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');
    if (amount <= 0) return interaction.reply({ content: 'Montant invalide.', ephemeral: true });

    if (sub === 'add-money') {
      economyService.addMoney(interaction.guild.id, target.id, amount);
      return interaction.reply({ embeds: [createEmbed({ title: 'Économie HRP', description: `${amount} crédits ajoutés à ${target}.`, color: 0x2ecc71 })] });
    }

    economyService.removeMoney(interaction.guild.id, target.id, amount);
    return interaction.reply({ embeds: [createEmbed({ title: 'Économie HRP', description: `${amount} crédits retirés à ${target}.`, color: 0xe67e22 })] });
  }
};
