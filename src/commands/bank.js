const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../services/embed');
const economyService = require('../services/economyService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('Gestion bancaire immersive')
    .addSubcommand(sub => sub.setName('create-account').setDescription('Ouvre un compte bancaire RP'))
    .addSubcommand(sub => sub
      .setName('deposit')
      .setDescription('Dépose des fonds à la banque')
      .addIntegerOption(option => option.setName('amount').setDescription('Montant').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('withdraw')
      .setDescription('Retire des fonds de votre compte bancaire')
      .addIntegerOption(option => option.setName('amount').setDescription('Montant').setRequired(true)))
    .addSubcommand(sub => sub.setName('account').setDescription('Voir le détail de votre compte bancaire')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const currency = economyService.getCurrencyName(guildId) || 'Crédits';

    if (sub === 'create-account') {
      economyService.createBankAccount(guildId, interaction.user.id);
      return interaction.reply({ embeds: [createEmbed({ title: 'Banque', description: 'Votre compte bancaire a été créé. Vous pouvez maintenant déposer des fonds.', color: 0x1abc9c })] });
    }

    if (sub === 'deposit') {
      const amount = interaction.options.getInteger('amount');
      if (!economyService.deposit(guildId, interaction.user.id, amount)) {
        return interaction.reply({ content: 'Dépôt impossible : fonds insuffisants ou compte inexistant.', ephemeral: true });
      }
      return interaction.reply({ embeds: [createEmbed({ title: 'Banque', description: `${amount} ${currency} déposés sur votre compte.`, color: 0x3498db })] });
    }

    if (sub === 'withdraw') {
      const amount = interaction.options.getInteger('amount');
      if (!economyService.withdraw(guildId, interaction.user.id, amount)) {
        return interaction.reply({ content: 'Retrait impossible : fonds insuffisants ou compte inexistant.', ephemeral: true });
      }
      return interaction.reply({ embeds: [createEmbed({ title: 'Banque', description: `${amount} ${currency} retirés de votre compte.`, color: 0x3498db })] });
    }

    const account = economyService.getBankAccount(guildId, interaction.user.id);
    if (!account) {
      return interaction.reply({ content: 'Aucun compte bancaire trouvé. Utilisez /bank create-account.', ephemeral: true });
    }
    const history = economyService.getTransactionHistory(guildId, interaction.user.id).map(item => `• ${item.type} : ${item.amount} (${new Date(item.createdAt).toLocaleDateString()})`).join('\n') || 'Aucune transaction récente.';
    return interaction.reply({ embeds: [createEmbed({ title: 'Détails du compte bancaire', description: `Solde : **${account.balance} ${currency}**\nOuvert le : <t:${Math.floor(new Date(account.createdAt).getTime() / 1000)}:d>`, fields: [{ name: 'Historique', value: history }] })] });
  }
};
