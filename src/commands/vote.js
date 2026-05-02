const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../services/embed');
const voteService = require('../services/voteService');
const db = require('../services/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Gère les votes parlementaires RP')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Crée un vote officiel')
      .addStringOption(option => option.setName('title').setDescription('Titre du vote').setRequired(true))
      .addStringOption(option => option.setName('description').setDescription('Description du vote').setRequired(true))
      .addIntegerOption(option => option.setName('quorum').setDescription('Quorum minimal').setRequired(false))
      .addStringOption(option => option.setName('majority').setDescription('Type de majorité').addChoices(
        { name: 'Simple', value: 'simple' },
        { name: 'Deux tiers', value: 'two-thirds' }
      ))
    )
    .addSubcommand(sub => sub
      .setName('end')
      .setDescription('Termine un vote en cours')
      .addIntegerOption(option => option.setName('id').setDescription('ID du vote').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('results')
      .setDescription('Affiche les résultats d’un vote')
      .addIntegerOption(option => option.setName('id').setDescription('ID du vote').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const roleIds = db.filter('parish_roles', { guildId: interaction.guild.id }).map(row => row.roleId);
    const isParliament = interaction.member.roles.cache.some(role => roleIds.includes(role.id));

    if (sub === 'create' && !isParliament) {
      return interaction.reply({ content: 'Seuls les membres du parlement peuvent créer un vote.', ephemeral: true });
    }

    if (sub === 'create') {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const quorum = interaction.options.getInteger('quorum') || 1;
      const majority = interaction.options.getString('majority') || 'simple';
      const voteId = voteService.createVote(interaction.guild.id, title, description, interaction.user.id, quorum, majority);

      const embed = createEmbed({
        title: `Vote officiel #${voteId}`,
        description: `**${title}**\n${description}\n\nQuorum requis : ${quorum} membre(s). Majorité : ${majority === 'two-thirds' ? 'Deux tiers' : 'Simple'}.`,
        color: 0xf1c40f
      });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`vote:yes:${voteId}`).setLabel('Oui').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`vote:no:${voteId}`).setLabel('Non').setStyle(ButtonStyle.Danger)
      );
      const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      voteService.setVoteMessage(voteId, message.id);
      return;
    }

    const voteId = interaction.options.getInteger('id');
    if (sub === 'end') {
      const vote = voteService.getOpenVote(voteId);
      if (!vote) return interaction.reply({ content: 'Vote introuvable ou déjà clos.', ephemeral: true });
      const results = voteService.endVote(voteId);
      return interaction.reply({ embeds: [createEmbed({ title: `Résultats Vote #${voteId}`, description: `Oui : ${results.yes}\nNon : ${results.no}\nTotal : ${results.total}`, color: 0x2ecc71 })] });
    }

    if (sub === 'results') {
      const results = voteService.getResults(voteId);
      if (!results.vote) return interaction.reply({ content: 'Vote introuvable.', ephemeral: true });
      return interaction.reply({ embeds: [createEmbed({ title: `Résultats Vote #${voteId}`, description: `Oui : ${results.yes}\nNon : ${results.no}\nTotal : ${results.total}\nStatut : ${results.vote.status}`, color: 0x3498db })] });
    }
  }
};
