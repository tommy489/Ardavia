const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../services/embed');
const economyService = require('../services/economyService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('RP banking system')
    .addSubcommand(sub => sub.setName('create-account').setDescription('Open an RP bank account'))
    .addSubcommand(sub => sub
      .setName('deposit')
      .setDescription('Deposit funds into your bank account')
      .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('withdraw')
      .setDescription('Withdraw funds from your bank account')
      .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)))
    .addSubcommand(sub => sub.setName('account').setDescription('View your bank account details')),

  async execute(interaction) {
    const sub      = interaction.options.getSubcommand();
    const guildId  = interaction.guild.id;
    const currency = economyService.getCurrencyName(guildId) || 'Credits';

    if (sub === 'create-account') {
      economyService.createBankAccount(guildId, interaction.user.id);
      return interaction.reply({ embeds: [createEmbed({ title: 'Bank', description: 'Your bank account has been created. You can now deposit funds.', color: 0x1abc9c })] });
    }

    if (sub === 'deposit') {
      const amount = interaction.options.getInteger('amount');
      if (!economyService.deposit(guildId, interaction.user.id, amount)) {
        return interaction.reply({ content: 'Deposit failed: insufficient funds or no account found.', ephemeral: true });
      }
      return interaction.reply({ embeds: [createEmbed({ title: 'Bank', description: `${amount} ${currency} deposited into your account.`, color: 0x3498db })] });
    }

    if (sub === 'withdraw') {
      const amount = interaction.options.getInteger('amount');
      if (!economyService.withdraw(guildId, interaction.user.id, amount)) {
        return interaction.reply({ content: 'Withdrawal failed: insufficient funds or no account found.', ephemeral: true });
      }
      return interaction.reply({ embeds: [createEmbed({ title: 'Bank', description: `${amount} ${currency} withdrawn from your account.`, color: 0x3498db })] });
    }

    const account = economyService.getBankAccount(guildId, interaction.user.id);
    if (!account) {
      return interaction.reply({ content: 'No bank account found. Use `/bank create-account` first.', ephemeral: true });
    }
    const history = economyService.getTransactionHistory(guildId, interaction.user.id)
      .map(t => `• ${t.type}: ${t.amount} ${currency} (<t:${Math.floor(new Date(t.createdAt).getTime() / 1000)}:d>)`)
      .join('\n') || 'No recent transactions.';

    return interaction.reply({ embeds: [createEmbed({
      title: 'Bank Account',
      description: `Balance: **${account.balance} ${currency}**\nOpened: <t:${Math.floor(new Date(account.createdAt).getTime() / 1000)}:d>`,
      fields: [{ name: 'Transaction History', value: history }]
    })] });
  }
};
