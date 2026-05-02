const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const voteService = require('../services/voteService');
const ticketService = require('../services/ticketService');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (error) {
        client.logger.error(error);
        await interaction.reply({ content: 'Une erreur est survenue lors de l’exécution de la commande.', ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      const [action, target, voteId] = interaction.customId.split(':');

      if (action === 'vote' && ['yes', 'no'].includes(target)) {
        const vote = voteService.getOpenVote(parseInt(voteId, 10));
        if (!vote) return interaction.reply({ content: 'Ce vote est fermé ou introuvable.', ephemeral: true });
        voteService.castVote(vote.id, interaction.user.id, target);
        const results = voteService.getResults(vote.id);
        await interaction.reply({ content: `Vote enregistré : ${target.toUpperCase()}. Résultats actuels — Oui: ${results.yes} / Non: ${results.no}`, ephemeral: true });
      }

      if (action === 'ticket' && target === 'create') {
        const panel = ticketService.getTicketPanel(interaction.guild.id);
        if (!panel) return interaction.reply({ content: 'Le système de tickets n’est pas configuré.', ephemeral: true });

        const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.id}` && c.type === 0);
        if (existing) return interaction.reply({ content: 'Vous avez déjà un ticket ouvert.', ephemeral: true });

        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: 0,
          topic: `Ticket de ${interaction.user.tag}`,
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone, deny: ['ViewChannel'] },
            { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
            { id: panel.staffRoleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
          ]
        });
        ticketService.createTicket(interaction.guild.id, interaction.user.id, channel.id);
        await interaction.reply({ content: `Ticket créé : ${channel}`, ephemeral: true });
        await channel.send({ embeds: [new EmbedBuilder().setTitle('Ticket Ardavia Council').setDescription('Un membre du staff va vous assister. Utilisez le bouton pour fermer le ticket lorsque c’est terminé.').setColor(0x1862a6)], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket:close').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger))] });
      }

      if (action === 'ticket' && target === 'close') {
        const ticket = ticketService.getTicketByChannel(interaction.guild.id, interaction.channel.id);
        if (!ticket) return interaction.reply({ content: 'Ce salon n’est pas un ticket valide.', ephemeral: true });
        ticketService.closeTicket(interaction.guild.id, interaction.channel.id);
        await interaction.channel.send({ embeds: [new EmbedBuilder().setTitle('Ticket fermé').setDescription('Ce ticket a été clôturé par le staff.').setColor(0x2f3136)] });
        await interaction.reply({ content: 'Ticket fermé avec succès.', ephemeral: true });
        setTimeout(() => interaction.channel.delete().catch(() => undefined), 5000);
      }

      if (action === 'help') {
        const pages = {
          rp: { title: 'Commandes RP', description: '/rp balance, /rp pay, /bank, /vote' },
          hrp: { title: 'Commandes HRP', description: '/hrp add-money, /hrp remove-money, /set-currency, /raidprotect' },
          gov: { title: 'Gouvernement', description: '/set-parliament-role, /vote create, /vote end, /vote results' },
          eco: { title: 'Économie', description: '/balance, /pay, /bank, /set-currency' },
          mod: { title: 'Modération', description: '/raidprotect, /ticket setup, /ticket close' }
        };
        const page = pages[target] || pages.rp;
        const embed = new EmbedBuilder().setTitle(page.title).setDescription(page.description).setColor(0x1862a6).setTimestamp();
        await interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('help:rp').setLabel('RP').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('help:hrp').setLabel('HRP').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('help:gov').setLabel('Gouvernement').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('help:eco').setLabel('Économie').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('help:mod').setLabel('Modération').setStyle(ButtonStyle.Danger)
        )]});
      }
    }
  }
};
