const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ticketService = require('../services/ticketService');
const { createEmbed } = require('../services/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Système de tickets staff privé')
    .addSubcommand(sub => sub.setName('setup').setDescription('Configure le panneau de tickets').addRoleOption(option => option.setName('staff').setDescription('Rôle staff').setRequired(true)))
    .addSubcommand(sub => sub.setName('close').setDescription('Ferme le ticket actif')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      if (!interaction.member.permissions.has('ManageChannels')) {
        return interaction.reply({ content: 'Permission requise : gérer les salons.', ephemeral: true });
      }
      const staffRole = interaction.options.getRole('staff');
      const embed = createEmbed({ title: 'Panel de tickets', description: 'Cliquez sur le bouton ci-dessous pour créer un ticket privé avec le staff.', color: 0x1f8bfe });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket:create').setLabel('Créer un ticket').setStyle(ButtonStyle.Primary)
      );
      const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      ticketService.createTicketPanel(interaction.guild.id, interaction.channel.id, message.id, staffRole.id);
      return;
    }

    const ticket = ticketService.getTicketByChannel(interaction.guild.id, interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un salon de ticket.', ephemeral: true });
    }
    ticketService.closeTicket(interaction.guild.id, interaction.channel.id);
    await interaction.reply({ embeds: [createEmbed({ title: 'Ticket', description: 'Le ticket est fermé, ce salon sera supprimé dans quelques instants.', color: 0xe74c3c })] });
    setTimeout(() => interaction.channel.delete().catch(() => undefined), 5000);
  }
};
