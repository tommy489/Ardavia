const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const securityService = require('../services/securityService');

const COLOR   = 0xe74c3c;
const FOOTER  = 'Ardavia Council • Sécurité';

const PROTECTION_LABELS = {
  antispam:    '🔁 Anti-Spam',
  antiraid:    '🚨 Anti-Raid',
  antimention: '📢 Anti Mass-Mention',
  antibot:     '🤖 Anti-Bot'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('security')
    .setDescription('Système de sécurité du serveur Ardavia')

    .addSubcommand(sub => sub
      .setName('enable')
      .setDescription('Active le système de sécurité')
    )

    .addSubcommand(sub => sub
      .setName('disable')
      .setDescription('Désactive entièrement le système de sécurité')
    )

    .addSubcommand(sub => sub
      .setName('status')
      .setDescription('Affiche la configuration complète de la sécurité')
    )

    .addSubcommand(sub => sub
      .setName('config')
      .setDescription('Configure une protection spécifique')
      .addStringOption(o => o
        .setName('protection')
        .setDescription('Protection à configurer')
        .setRequired(true)
        .addChoices(
          { name: '🔁 Anti-Spam',          value: 'antispam'    },
          { name: '🚨 Anti-Raid',           value: 'antiraid'    },
          { name: '📢 Anti Mass-Mention',   value: 'antimention' },
          { name: '🤖 Anti-Bot',            value: 'antibot'     }
        )
      )
      .addStringOption(o => o
        .setName('status')
        .setDescription('Activer ou désactiver cette protection')
        .addChoices(
          { name: '✅ Activer',    value: 'on'  },
          { name: '❌ Désactiver', value: 'off' }
        )
      )
      .addStringOption(o => o
        .setName('action')
        .setDescription('Action appliquée lors d\'un déclenchement')
        .addChoices(
          { name: '⚠️ Avertissement (warn)',  value: 'warn' },
          { name: '🔇 Mute (10 min)',          value: 'mute' },
          { name: '👢 Expulsion (kick)',        value: 'kick' },
          { name: '🔨 Bannissement (ban)',      value: 'ban'  }
        )
      )
      .addIntegerOption(o => o.setName('threshold').setDescription('Seuil de déclenchement').setMinValue(1).setMaxValue(100))
      .addIntegerOption(o => o.setName('interval').setDescription('Intervalle de détection en secondes').setMinValue(1).setMaxValue(120))
    )

    .addSubcommand(sub => sub
      .setName('logs')
      .setDescription('Définit le salon de réception des logs de sécurité')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('Salon de logs')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
      )
    )

    .addSubcommand(sub => sub
      .setName('whitelist-role')
      .setDescription('Gère les rôles immunisés contre les détections automatiques')
      .addRoleOption(o => o.setName('role').setDescription('Rôle concerné').setRequired(true))
      .addStringOption(o => o
        .setName('action')
        .setDescription('Ajouter ou retirer de la liste blanche')
        .setRequired(true)
        .addChoices(
          { name: '➕ Ajouter',  value: 'add'    },
          { name: '➖ Retirer',  value: 'remove' }
        )
      )
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({
        content: '⛔ Permission requise : **Gérer le serveur**.',
        ephemeral: true
      });
    }

    const sub  = interaction.options.getSubcommand();
    const { guild } = interaction;

    // ── Enable / Disable ────────────────────────────────────────────────────
    if (sub === 'enable' || sub === 'disable') {
      const on = sub === 'enable';
      securityService.setConfig(guild.id, { enabled: on });

      const embed = new EmbedBuilder()
        .setColor(on ? 0x2ecc71 : 0x95a5a6)
        .setTitle(`🛡️  Sécurité ${on ? 'Activée' : 'Désactivée'}`)
        .setDescription(on
          ? 'Le système de sécurité est désormais **actif**.\nToutes les protections configurées sont en service.'
          : 'Le système de sécurité est **désactivé**.\nAucune protection n\'est en service.')
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── Status ───────────────────────────────────────────────────────────────
    if (sub === 'status') {
      const cfg = securityService.getConfig(guild.id);
      const bool = (v) => v ? '✅ Actif' : '❌ Inactif';
      const whitelistRoles = Array.isArray(cfg.whitelist_roles) && cfg.whitelist_roles.length
        ? cfg.whitelist_roles.map(id => `<@&${id}>`).join(', ')
        : 'Aucun';

      const embed = new EmbedBuilder()
        .setColor(cfg.enabled ? COLOR : 0x95a5a6)
        .setTitle('🛡️  Configuration de Sécurité — Ardavia')
        .setDescription(`**Système global :** ${cfg.enabled ? '✅ Actif' : '❌ Inactif'}\n**Intervalle :** ${cfg.intervalSeconds}s\n**Logs :** ${cfg.logsChannelId ? `<#${cfg.logsChannelId}>` : 'Non configuré'}`)
        .addFields(
          { name: PROTECTION_LABELS.antispam,    value: `${bool(cfg.antispam_enabled)}\nSeuil : ${cfg.antispam_threshold} msg → \`${cfg.antispam_action}\``,       inline: true },
          { name: PROTECTION_LABELS.antiraid,    value: `${bool(cfg.antiraid_enabled)}\nSeuil : ${cfg.antiraid_threshold} join → \`${cfg.antiraid_action}\``,      inline: true },
          { name: PROTECTION_LABELS.antimention, value: `${bool(cfg.antimention_enabled)}\nSeuil : ${cfg.antimention_threshold} mentions → \`${cfg.antimention_action}\``, inline: true },
          { name: PROTECTION_LABELS.antibot,     value: `${bool(cfg.antibot_enabled)}\nAction : \`${cfg.antibot_action}\``,                                          inline: true },
          { name: '🤍 Rôles exemptés', value: whitelistRoles, inline: false }
        )
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ── Config ───────────────────────────────────────────────────────────────
    if (sub === 'config') {
      const protection = interaction.options.getString('protection');
      const status     = interaction.options.getString('status');
      const action     = interaction.options.getString('action');
      const threshold  = interaction.options.getInteger('threshold');
      const interval   = interaction.options.getInteger('interval');

      const updates = {};
      if (status    !== null) updates[`${protection}_enabled`]   = status === 'on';
      if (action    !== null) updates[`${protection}_action`]    = action;
      if (threshold !== null) updates[`${protection}_threshold`] = threshold;
      if (interval  !== null) updates.intervalSeconds            = interval;

      if (!Object.keys(updates).length) {
        return interaction.reply({ content: '⚠️ Aucune modification fournie.', ephemeral: true });
      }

      securityService.setConfig(guild.id, updates);
      const cfg = securityService.getConfig(guild.id);

      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(`🛡️  ${PROTECTION_LABELS[protection]} — Configuration mise à jour`)
        .addFields(
          { name: '🔘 Statut',    value: cfg[`${protection}_enabled`] ? '✅ Actif' : '❌ Inactif',                              inline: true },
          { name: '⚡ Action',    value: `\`${cfg[`${protection}_action`] ?? 'N/A'}\``,                                          inline: true },
          ...(protection !== 'antibot' ? [{ name: '📊 Seuil', value: String(cfg[`${protection}_threshold`] ?? 'N/A'), inline: true }] : []),
          { name: '⏱️ Intervalle', value: `${cfg.intervalSeconds}s`,                                                              inline: true }
        )
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── Logs ─────────────────────────────────────────────────────────────────
    if (sub === 'logs') {
      const channel = interaction.options.getChannel('channel');
      securityService.setConfig(guild.id, { logsChannelId: channel.id });

      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('🛡️  Canal de Logs configuré')
        .setDescription(`Les alertes de sécurité seront envoyées dans ${channel}.`)
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── Whitelist-role ───────────────────────────────────────────────────────
    if (sub === 'whitelist-role') {
      const role   = interaction.options.getRole('role');
      const action = interaction.options.getString('action');

      if (action === 'add') {
        securityService.addWhitelistRole(guild.id, role.id);
      } else {
        securityService.removeWhitelistRole(guild.id, role.id);
      }

      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('🛡️  Liste Blanche mise à jour')
        .setDescription(`Le rôle ${role} a été **${action === 'add' ? 'ajouté à' : 'retiré de'}** la liste blanche.\nCe rôle est ${action === 'add' ? 'désormais immunisé' : 'à nouveau soumis'} aux détections automatiques.`)
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }
};
