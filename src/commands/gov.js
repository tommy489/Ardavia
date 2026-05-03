const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const voteService = require('../services/voteService');
const lawService = require('../services/lawService');
const db = require('../services/db');

const FOOTER = 'Ardavia Council • Government';

function isParliamentMember(member, guildId) {
  const roleIds = db.filter('parish_roles', { guildId }).map(r => r.roleId);
  return roleIds.length > 0 && member.roles.cache.some(role => roleIds.includes(role.id));
}

function buildVoteOpenEmbed(voteId, title, description, quorum, majority, user) {
  const majorityLabel = majority === 'two-thirds' ? 'Two-thirds (≥ 66.7%)' : 'Simple majority (> 50%)';
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`🏛️  Official Vote  •  #${voteId}`)
    .setDescription(`**${title}**\n\n${description}`)
    .addFields(
      { name: '⚖️ Required Quorum', value: `${quorum} member(s)`, inline: true },
      { name: '📊 Majority',        value: majorityLabel,          inline: true },
      { name: '👤 Proposed by',     value: user.toString(),        inline: true }
    )
    .setFooter({ text: FOOTER })
    .setTimestamp();
}

function buildVoteResultsEmbed(voteId, vote, yes, no, total, isFinal) {
  const quorumMet   = total >= vote.quorum;
  const majorityMet = vote.majority === 'two-thirds'
    ? (total > 0 && yes / total >= 2 / 3)
    : yes > no;
  const passed = isFinal && quorumMet && majorityMet;

  const yesPercent = total > 0 ? ((yes / total) * 100).toFixed(1) : '0.0';
  const noPercent  = total > 0 ? ((no  / total) * 100).toFixed(1) : '0.0';

  const color   = !isFinal ? 0x3498db : passed ? 0x2ecc71 : 0xe74c3c;
  const verdict = !isFinal ? '🔵 Vote in progress' : passed ? '✅  **PASSED**' : '❌  **REJECTED**';

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`📊  Vote Results  •  #${voteId}`)
    .setDescription(`**${vote.title}**\n\n${verdict}`)
    .addFields(
      { name: '✅ In favour', value: `${yes} vote(s) — ${yesPercent}%`, inline: true },
      { name: '❌ Against',   value: `${no} vote(s) — ${noPercent}%`,   inline: true },
      { name: '👥 Total',     value: `${total} vote(s)`,                 inline: true },
      {
        name: '🏟️ Quorum',
        value: `${quorumMet ? '✅' : '❌'}  ${total} / ${vote.quorum} required`,
        inline: true
      },
      {
        name: '⚖️ Majority',
        value: `${majorityMet ? '✅' : '❌'}  ${vote.majority === 'two-thirds' ? 'Two-thirds' : 'Simple'}`,
        inline: true
      }
    )
    .setFooter({ text: FOOTER })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gov')
    .setDescription('Government commands of the Ardavia Parliament')

    .addSubcommandGroup(group => group
      .setName('vote')
      .setDescription('Parliament vote management')
      .addSubcommand(sub => sub
        .setName('create')
        .setDescription('Submit an official vote to parliament')
        .addStringOption(o => o.setName('title').setDescription('Title of the proposal').setRequired(true))
        .addStringOption(o => o.setName('description').setDescription('Full text of the proposal').setRequired(true))
        .addIntegerOption(o => o.setName('quorum').setDescription('Minimum number of votes required (default: 1)').setMinValue(1))
        .addStringOption(o => o.setName('majority').setDescription('Required majority type').addChoices(
          { name: 'Simple (> 50%)',       value: 'simple'     },
          { name: 'Two-thirds (≥ 66.7%)', value: 'two-thirds' }
        ))
      )
      .addSubcommand(sub => sub
        .setName('end')
        .setDescription('Close a vote and publish the official result')
        .addIntegerOption(o => o.setName('id').setDescription('Vote ID').setRequired(true).setMinValue(1))
      )
      .addSubcommand(sub => sub
        .setName('results')
        .setDescription('Check the live results of a vote')
        .addIntegerOption(o => o.setName('id').setDescription('Vote ID').setRequired(true).setMinValue(1))
      )
    )

    .addSubcommandGroup(group => group
      .setName('parliament-role')
      .setDescription('Parliament role management')
      .addSubcommand(sub => sub
        .setName('set')
        .setDescription('Authorise a role to use parliament commands')
        .addRoleOption(o => o.setName('role').setDescription('Role to authorise').setRequired(true))
      )
    )

    .addSubcommandGroup(group => group
      .setName('law')
      .setDescription('Ardavia law registry')
      .addSubcommand(sub => sub
        .setName('create')
        .setDescription('Enact a new law into the official registry')
        .addStringOption(o => o.setName('title').setDescription('Official title of the law').setRequired(true))
        .addStringOption(o => o.setName('content').setDescription('Text of the law').setRequired(true))
        .addIntegerOption(o => o.setName('vote-id').setDescription('ID of the vote that passed this law').setMinValue(1))
      )
      .addSubcommand(sub => sub
        .setName('list')
        .setDescription('Display the full registry of active laws')
      )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub   = interaction.options.getSubcommand();
    const { guild, member, user } = interaction;

    // ── /gov vote ────────────────────────────────────────────────────────────
    if (group === 'vote') {
      if (sub === 'create') {
        if (!isParliamentMember(member, guild.id)) {
          return interaction.reply({ content: '⛔ Only parliament members can submit a vote.', ephemeral: true });
        }

        const title       = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const quorum      = interaction.options.getInteger('quorum') ?? 1;
        const majority    = interaction.options.getString('majority') ?? 'simple';

        const voteId  = voteService.createVote(guild.id, title, description, user.id, quorum, majority);
        const embed   = buildVoteOpenEmbed(voteId, title, description, quorum, majority, user);
        const row     = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`vote:yes:${voteId}`).setLabel('✅  In favour').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`vote:no:${voteId}`).setLabel('❌  Against').setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        voteService.setVoteMessage(voteId, message.id);
        return;
      }

      const voteId = interaction.options.getInteger('id');

      if (sub === 'end') {
        if (!isParliamentMember(member, guild.id)) {
          return interaction.reply({ content: '⛔ Only parliament members can close a vote.', ephemeral: true });
        }

        const vote = voteService.getOpenVote(voteId);
        if (!vote) {
          return interaction.reply({ content: `⚠️ Vote **#${voteId}** not found or already closed.`, ephemeral: true });
        }

        const results = voteService.endVote(voteId);
        const embed   = buildVoteResultsEmbed(voteId, results.vote, results.yes, results.no, results.total, true);

        if (vote.messageId) {
          try {
            const msg = await interaction.channel.messages.fetch(vote.messageId);
            const disabledRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`vote:yes:${voteId}`).setLabel('✅  In favour').setStyle(ButtonStyle.Success).setDisabled(true),
              new ButtonBuilder().setCustomId(`vote:no:${voteId}`).setLabel('❌  Against').setStyle(ButtonStyle.Danger).setDisabled(true)
            );
            await msg.edit({ components: [disabledRow] });
          } catch (_) {}
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'results') {
        const results = voteService.getResults(voteId);
        if (!results.vote) {
          return interaction.reply({ content: `⚠️ Vote **#${voteId}** not found.`, ephemeral: true });
        }
        const isFinal = results.vote.status === 'closed';
        const embed   = buildVoteResultsEmbed(voteId, results.vote, results.yes, results.no, results.total, isFinal);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // ── /gov parliament-role ─────────────────────────────────────────────────
    if (group === 'parliament-role' && sub === 'set') {
      if (!member.permissions.has('ManageRoles')) {
        return interaction.reply({ content: '⛔ Permission required: **Manage Roles**.', ephemeral: true });
      }

      const role = interaction.options.getRole('role');
      db.upsert('parish_roles', { guildId: guild.id, roleId: role.id }, { guildId: guild.id, roleId: role.id });

      const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle('🏛️  Parliament Role Updated')
        .setDescription(`${role} is now authorised to submit and manage official votes.`)
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── /gov law ─────────────────────────────────────────────────────────────
    if (group === 'law') {
      if (sub === 'create') {
        if (!isParliamentMember(member, guild.id)) {
          return interaction.reply({ content: '⛔ Only parliament members can enact a law.', ephemeral: true });
        }

        const title   = interaction.options.getString('title');
        const content = interaction.options.getString('content');
        const voteRef = interaction.options.getInteger('vote-id') ?? null;
        const lawId   = lawService.createLaw(guild.id, title, content, user.id, voteRef);

        const fields = [{ name: '👤 Enacted by', value: user.toString(), inline: true }];
        if (voteRef) fields.push({ name: '🗳️ Reference vote', value: `#${voteRef}`, inline: true });

        const embed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle(`📜  Law Enacted  •  #${lawId}`)
          .setDescription(`**${title}**\n\n${content}`)
          .addFields(fields)
          .setFooter({ text: 'Ardavia Council • Law Registry' })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'list') {
        const laws = lawService.getLaws(guild.id);

        if (!laws.length) {
          return interaction.reply({ content: '📋 No laws are currently registered on this server.', ephemeral: true });
        }

        const lines = laws.map(law =>
          `**Law #${law.id}** — ${law.title}${law.voteId ? `  *(Vote #${law.voteId})*` : ''}`
        ).join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle('📚  Law Registry — Ardavia')
          .setDescription(lines)
          .setFooter({ text: `${laws.length} active law(s) • Ardavia Council` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }
};
