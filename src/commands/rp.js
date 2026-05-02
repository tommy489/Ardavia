const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../services/embed');
const economyService = require('../services/economyService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rp')
    .setDescription('Commandes RP immersives')
    .addSubcommand(sub => sub.setName('balance').setDescription('Voir votre solde RP'))
    .addSubcommand(sub => sub
      .setName('pay')
      .setDescription('Payer un autre citoyen')
      .addUserOption(option => option.setName('target').setDescription('Cible').setRequired(true))
      .addIntegerOption(option => option.setName('amount').setDescription('Montant').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const currency = economyService.getCurrencyName(interaction.guild.id) || 'Crédits';

    if (sub === 'balance') {
      const balance = economyService.getBalance(interaction.guild.id, interaction.user.id);
      return interaction.reply({ embeds: [createEmbed({ title: 'Solde RP', description: `${interaction.user} possède **${balance} ${currency}**.`, color: 0x1abc9c })] });
    }

    const target = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'Vous ne pouvez pas vous payer vous-même.', ephemeral: true });
    }
    if (amount <= 0) {
      return interaction.reply({ content: 'Montant invalide.', ephemeral: true });
    }
    const success = economyService.pay(interaction.guild.id, interaction.user.id, target.id, amount);
    if (!success) return interaction.reply({ content: 'Fonds insuffisants.', ephemeral: true });

    return interaction.reply({ embeds: [createEmbed({ title: 'Transaction RP', description: `${interaction.user} a transféré **${amount} ${currency}** à ${target}.`, color: 0x3498db })] });
  }
};
