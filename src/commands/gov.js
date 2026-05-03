const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const voteService = require('../services/voteService');
const lawService = require('../services/lawService');
const db = require('../services/db');

const FOOTER = 'Ardavia Council • Gouvernement';

function isParliamentMember(member, guildId) {
  const roleIds = db.filter('parish_roles', { guildId }).map(r => r.roleId);
  return roleIds.length > 0 && member.roles.cache.some(role => roleIds.includes(role.id));
}

function buildVoteOpenEmbed(voteId, title, description, quorum, majority, user) {
  const majorityLabel = majority === 'two-thirds' ? 'Deux tiers (≥ 66.7%)' : 'Majorité simple (> 50%)';
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`🏛️  Vote Officiel  •  #${voteId}`)
    .setDescription(`**${title}**\n\n${description}`)
    .addFields(
      { name: '⚖️ Quorum requis', value: `${quorum} membre(s)`, inline: true },
      { name: '📊 Majorité', value: majorityLabel, inline: true },
      { name: '👤 Proposé par', value: user.toString(), inline: true }
    )
    .setFooter({ text: FOOTER })
    .setTimestamp();
}

function buildVoteResultsEmbed(voteId, vote, yes, no, total, isFinal) {
  const quorumMet = total >= vote.quorum;
  const majorityMet = vote.majority === 'two-thirds'
    ? (total > 0 && yes / total >= 2 / 3)
    : yes > no;
  const passed = isFinal && quorumMet && majorityMet;

  const yesPercent = total > 0 ? ((yes / total) * 100).toFixed(1) : '0.0';
  const noPercent  = total > 0 ? ((no  / total) * 100).toFixed(1) : '0.0';

  const color = !isFinal ? 0x3498db : passed ? 0x2ecc71 : 0xe74c3c;
  const verdict = !isFinal ? '🔵 Vote en cours' : passed ? '✅  **ADOPTÉ**' : '❌  **REJETÉ**';

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`📊  Résultats du Vote  •  #${voteId}`)
    .setDescription(`**${vote.title}**\n\n${verdict}`)
    .addFields(
      { name: '✅ Pour',    value: `${yes} vote(s) — ${yesPercent}%`, inline: true },
      { name: '❌ Contre',  value: `${no} vote(s) — ${noPercent}%`,   inline: true },
      { name: '👥 Total',   value: `${total} vote(s)`,                 inline: true },
      {
        name: '🏟️ Quorum',
        value: `${quorumMet ? '✅' : '❌'}  ${total} / ${vote.quorum} requis`,
        inline: true
      },
      {
        name: '⚖️ Majorité',
        value: `${majorityMet ? '✅' : '❌'}  ${vote.majority === 'two-thirds' ? 'Deux tiers' : 'Simple'}`,
        inline: true
      }
    )
    .setFooter({ text: FOOTER })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gov')
    .setDescription('Commandes gouvernementales du Parlement d\'Ardavia')

    // ── /gov vote ────────────────────────────────────────────────────────────
    .addSubcommandGroup(group => group
      .setName('vote')
      .setDescription('Gestion des votes parlementaires')
      .addSubcommand(sub => sub
        .setName('create')
        .setDescription('Soumet un vote officiel au parlement')
        .addStringOption(o => o.setName('title').setDescription('Titre de la proposition').setRequired(true))
        .addStringOption(o => o.setName('description').setDescription('Texte complet de la proposition').setRequired(true))
        .addIntegerOption(o => o.setName('quorum').setDescription('Nombre minimal de votes requis (défaut : 1)').setMinValue(1))
        .addStringOption(o => o.setName('majority').setDescription('Type de majorité requis').addChoices(
          { name: 'Simple (> 50%)',      value: 'simple'     },
          { name: 'Deux tiers (≥ 66.7%)', value: 'two-thirds' }
        ))
      )
      .addSubcommand(sub => sub
        .setName('end')
        .setDescription('Clôture un vote et publie le résultat officiel')
        .addIntegerOption(o => o.setName('id').setDescription('Identifiant du vote').setRequired(true).setMinValue(1))
      )
      .addSubcommand(sub => sub
        .setName('results')
        .setDescription('Consulte les résultats en temps réel d\'un vote')
        .addIntegerOption(o => o.setName('id').setDescription('Identifiant du vote').setRequired(true).setMinValue(1))
      )
    )

    // ── /gov parliament-role ─────────────────────────────────────────────────
    .addSubcommandGroup(group => group
      .setName('parliament-role')
      .setDescription('Gestion du rôle parlementaire')
      .addSubcommand(sub => sub
        .setName('set')
        .setDescription('Autorise un rôle à utiliser les commandes parlementaires')
        .addRoleOption(o => o.setName('role').setDescription('Rôle à autoriser').setRequired(true))
      )
    )

    // ── /gov law ─────────────────────────────────────────────────────────────
    .addSubcommandGroup(group => group
      .setName('law')
      .setDescription('Registre des lois d\'Ardavia')
      .addSubcommand(sub => sub
        .setName('create')
        .setDescription('Promulgue une nouvelle loi dans le registre officiel')
        .addStringOption(o => o.setName('title').setDescription('Titre officiel de la loi').setRequired(true))
        .addStringOption(o => o.setName('content').setDescription('Texte de la loi').setRequired(true))
        .addIntegerOption(o => o.setName('vote-id').setDescription('Identifiant du vote ayant adopté cette loi').setMinValue(1))
      )
      .addSubcommand(sub => sub
        .setName('list')
        .setDescription('Affiche le registre complet des lois en vigueur')
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
          return interaction.reply({
            content: '⛔ Seuls les membres du parlement peuvent soumettre un vote.',
            ephemeral: true
          });
        }

        const title       = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const quorum      = interaction.options.getInteger('quorum') ?? 1;
        const majority    = interaction.options.getString('majority') ?? 'simple';

        const voteId  = voteService.createVote(guild.id, title, description, user.id, quorum, majority);
        const embed   = buildVoteOpenEmbed(voteId, title, description, quorum, majority, user);
        const row     = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`vote:yes:${voteId}`).setLabel('✅  Pour').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`vote:no:${voteId}`).setLabel('❌  Contre').setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        voteService.setVoteMessage(voteId, message.id);
        return;
      }

      const voteId = interaction.options.getInteger('id');

      if (sub === 'end') {
        if (!isParliamentMember(member, guild.id)) {
          return interaction.reply({
            content: '⛔ Seuls les membres du parlement peuvent clôturer un vote.',
            ephemeral: true
          });
        }

        const vote = voteService.getOpenVote(voteId);
        if (!vote) {
          return interaction.reply({
            content: `⚠️ Le vote **#${voteId}** est introuvable ou déjà clôturé.`,
            ephemeral: true
          });
        }

        const results = voteService.endVote(voteId);
        const embed   = buildVoteResultsEmbed(voteId, results.vote, results.yes, results.no, results.total, true);

        // Disable vote buttons on the original message
        if (vote.messageId) {
          try {
            const msg = await interaction.channel.messages.fetch(vote.messageId);
            const disabledRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`vote:yes:${voteId}`).setLabel('✅  Pour').setStyle(ButtonStyle.Success).setDisabled(true),
              new ButtonBuilder().setCustomId(`vote:no:${voteId}`).setLabel('❌  Contre').setStyle(ButtonStyle.Danger).setDisabled(true)
            );
            await msg.edit({ components: [disabledRow] });
          } catch (_) { /* message may be in another channel or deleted */ }
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'results') {
        const results = voteService.getResults(voteId);
        if (!results.vote) {
          return interaction.reply({
            content: `⚠️ Le vote **#${voteId}** est introuvable.`,
            ephemeral: true
          });
        }
        const isFinal = results.vote.status === 'closed';
        const embed   = buildVoteResultsEmbed(voteId, results.vote, results.yes, results.no, results.total, isFinal);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // ── /gov parliament-role ─────────────────────────────────────────────────
    if (group === 'parliament-role' && sub === 'set') {
      if (!member.permissions.has('ManageRoles')) {
        return interaction.reply({
          content: '⛔ Permission requise : **Gérer les rôles**.',
          ephemeral: true
        });
      }

      const role = interaction.options.getRole('role');
      db.upsert('parish_roles', { guildId: guild.id, roleId: role.id }, {
        guildId: guild.id,
        roleId: role.id
      });

      const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle('🏛️  Rôle Parlementaire mis à jour')
        .setDescription(`Le rôle ${role} est désormais autorisé à soumettre et gérer les votes officiels.`)
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── /gov law ─────────────────────────────────────────────────────────────
    if (group === 'law') {
      if (sub === 'create') {
        if (!isParliamentMember(member, guild.id)) {
          return interaction.reply({
            content: '⛔ Seuls les membres du parlement peuvent promulguer une loi.',
            ephemeral: true
          });
        }

        const title   = interaction.options.getString('title');
        const content = interaction.options.getString('content');
        const voteRef = interaction.options.getInteger('vote-id') ?? null;

        const lawId = lawService.createLaw(guild.id, title, content, user.id, voteRef);

        const fields = [{ name: '👤 Promulguée par', value: user.toString(), inline: true }];
        if (voteRef) fields.push({ name: '🗳️ Vote de référence', value: `#${voteRef}`, inline: true });

        const embed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle(`📜  Loi Promulguée  •  #${lawId}`)
          .setDescription(`**${title}**\n\n${content}`)
          .addFields(fields)
          .setFooter({ text: 'Ardavia Council • Registre des Lois' })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'list') {
        const laws = lawService.getLaws(guild.id);

        if (!laws.length) {
          return interaction.reply({
            content: '📋 Aucune loi n\'est actuellement enregistrée dans ce serveur.',
            ephemeral: true
          });
        }

        const lines = laws.map(law =>
          `**Loi #${law.id}** — ${law.title}${law.voteId ? `  *(Vote #${law.voteId})*` : ''}`
        ).join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle('📚  Registre des Lois — Ardavia')
          .setDescription(lines)
          .setFooter({ text: `${laws.length} loi(s) en vigueur • Ardavia Council` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }
};
