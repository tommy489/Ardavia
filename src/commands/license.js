const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../services/embed');
const licenseService = require('../services/licenseService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('license')
    .setDescription('Gestion des licences RP')
    .addSubcommand(sub => sub
      .setName('set-license-role')
      .setDescription('Définit le rôle qui peut délivrer des licences')
      .addRoleOption(option => option.setName('role').setDescription('Rôle autorisé').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('give-license')
      .setDescription('Donne une licence à un membre')
      .addUserOption(option => option.setName('user').setDescription('Destinataire').setRequired(true))
      .addStringOption(option => option.setName('type').setDescription('Type de licence').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('remove-license')
      .setDescription('Retire une licence à un membre')
      .addUserOption(option => option.setName('user').setDescription('Membre').setRequired(true))
      .addStringOption(option => option.setName('type').setDescription('Type de licence').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('licenses')
      .setDescription('Affiche les licences d’un membre')
      .addUserOption(option => option.setName('user').setDescription('Membre').setRequired(false))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user') || interaction.user;

    if (sub === 'set-license-role') {
      if (!interaction.member.permissions.has('ManageRoles')) {
        return interaction.reply({ content: 'Permission requise : gérer les rôles.', ephemeral: true });
      }
      const role = interaction.options.getRole('role');
      licenseService.setLicenseRole(interaction.guild.id, role.id);
      return interaction.reply({ embeds: [createEmbed({ title: 'Licences', description: `Rôle ${role} autorisé à délivrer des licences.`, color: 0x1abc9c })] });
    }

    if (sub === 'give-license' || sub === 'remove-license') {
      const type = interaction.options.getString('type');
      const allowedRoles = licenseService.getLicenseRoles(interaction.guild.id);
      const hasRole = interaction.member.roles.cache.some(role => allowedRoles.includes(role.id));
      if (!hasRole && !interaction.member.permissions.has('ManageRoles')) {
        return interaction.reply({ content: 'Vous n’êtes pas autorisé à gérer les licences.', ephemeral: true });
      }
      if (sub === 'give-license') {
        licenseService.giveLicense(interaction.guild.id, user.id, type, interaction.user.id);
        return interaction.reply({ embeds: [createEmbed({ title: 'Licence accordée', description: `${user} reçoit la licence **${type}**.`, color: 0x2ecc71 })] });
      }
      licenseService.removeLicense(interaction.guild.id, user.id, type);
      return interaction.reply({ embeds: [createEmbed({ title: 'Licence retirée', description: `Licence **${type}** retirée à ${user}.`, color: 0xe74c3c })] });
    }

    const licenses = licenseService.listLicenses(interaction.guild.id, user.id);
    const description = licenses.length ? licenses.map(item => `• **${item.type}** donné par <@${item.givenBy}> le <t:${Math.floor(new Date(item.createdAt).getTime() / 1000)}:d>`).join('\n') : 'Aucune licence enregistrée.';
    return interaction.reply({ embeds: [createEmbed({ title: `Licences de ${user.username}`, description, color: 0x3498db })] });
  }
};
