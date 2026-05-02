const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../services/embed');
const db = require('../services/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-parliament-role')
    .setDescription('Définit le rôle parlementaire qui peut lancer des votes')
    .addRoleOption(option => option.setName('role').setDescription('Rôle du parlement').setRequired(true)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageRoles')) {
      return interaction.reply({ content: 'Permission requise : gérer les rôles.', ephemeral: true });
    }
    const role = interaction.options.getRole('role');
    const currentSettings = db.find('guild_settings', { guildId: interaction.guild.id }) || { currencyName: 'Crédits' };
    db.upsert('guild_settings', { guildId: interaction.guild.id }, {
      guildId: interaction.guild.id,
      currencyName: currentSettings.currencyName
    });
    db.upsert('parish_roles', { guildId: interaction.guild.id, roleId: role.id }, {
      guildId: interaction.guild.id,
      roleId: role.id
    });
    await interaction.reply({ embeds: [createEmbed({ title: 'Parlement', description: `Le rôle ${role} est désormais autorisé à lancer les votes officiels.`, color: 0x1abc9c })] });
  }
};
