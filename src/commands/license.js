const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../services/embed');
const licenseService = require('../services/licenseService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('license')
    .setDescription('RP license management')
    .addSubcommand(sub => sub
      .setName('set-license-role')
      .setDescription('Set the role that can issue licenses')
      .addRoleOption(o => o.setName('role').setDescription('Authorised role').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('give-license')
      .setDescription('Give a license to a member')
      .addUserOption(o => o.setName('user').setDescription('Recipient').setRequired(true))
      .addStringOption(o => o.setName('type').setDescription('License type').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('remove-license')
      .setDescription('Remove a license from a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
      .addStringOption(o => o.setName('type').setDescription('License type').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('licenses')
      .setDescription('View the licenses of a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(false))),

  async execute(interaction) {
    const sub  = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user') || interaction.user;

    if (sub === 'set-license-role') {
      if (!interaction.member.permissions.has('ManageRoles')) {
        return interaction.reply({ content: '⛔ Permission required: **Manage Roles**.', ephemeral: true });
      }
      const role = interaction.options.getRole('role');
      licenseService.setLicenseRole(interaction.guild.id, role.id);
      return interaction.reply({ embeds: [createEmbed({ title: 'Licenses', description: `${role} is now authorised to issue licenses.`, color: 0x1abc9c })] });
    }

    if (sub === 'give-license' || sub === 'remove-license') {
      const type         = interaction.options.getString('type');
      const allowedRoles = licenseService.getLicenseRoles(interaction.guild.id);
      const hasRole      = interaction.member.roles.cache.some(r => allowedRoles.includes(r.id));

      if (!hasRole && !interaction.member.permissions.has('ManageRoles')) {
        return interaction.reply({ content: '⛔ You are not authorised to manage licenses.', ephemeral: true });
      }

      if (sub === 'give-license') {
        licenseService.giveLicense(interaction.guild.id, user.id, type, interaction.user.id);
        return interaction.reply({ embeds: [createEmbed({ title: 'License Granted', description: `${user} has been granted the **${type}** license.`, color: 0x2ecc71 })] });
      }

      licenseService.removeLicense(interaction.guild.id, user.id, type);
      return interaction.reply({ embeds: [createEmbed({ title: 'License Revoked', description: `**${type}** license revoked from ${user}.`, color: 0xe74c3c })] });
    }

    const licenses    = licenseService.listLicenses(interaction.guild.id, user.id);
    const description = licenses.length
      ? licenses.map(l => `• **${l.type}** — issued by <@${l.givenBy}> on <t:${Math.floor(new Date(l.createdAt).getTime() / 1000)}:d>`).join('\n')
      : 'No licenses on record.';

    return interaction.reply({ embeds: [createEmbed({ title: `${user.username}'s Licenses`, description, color: 0x3498db })] });
  }
};
