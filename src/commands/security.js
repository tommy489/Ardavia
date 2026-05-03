const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const securityService = require('../services/securityService');

const COLOR  = 0xe74c3c;
const FOOTER = 'Ardavia Council • Security';

const PROTECTION_LABELS = {
  antispam:    '🔁 Anti-Spam',
  antiraid:    '🚨 Anti-Raid',
  antimention: '📢 Anti Mass-Mention',
  antibot:     '🤖 Anti-Bot'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('security')
    .setDescription('Server security system')

    .addSubcommand(sub => sub
      .setName('enable')
      .setDescription('Enable the security system')
    )
    .addSubcommand(sub => sub
      .setName('disable')
      .setDescription('Disable the security system entirely')
    )
    .addSubcommand(sub => sub
      .setName('status')
      .setDescription('Display the full security configuration')
    )
    .addSubcommand(sub => sub
      .setName('config')
      .setDescription('Configure a specific protection')
      .addStringOption(o => o
        .setName('protection')
        .setDescription('Protection to configure')
        .setRequired(true)
        .addChoices(
          { name: '🔁 Anti-Spam',        value: 'antispam'    },
          { name: '🚨 Anti-Raid',         value: 'antiraid'    },
          { name: '📢 Anti Mass-Mention', value: 'antimention' },
          { name: '🤖 Anti-Bot',          value: 'antibot'     }
        )
      )
      .addStringOption(o => o
        .setName('status')
        .setDescription('Enable or disable this protection')
        .addChoices(
          { name: '✅ Enable',  value: 'on'  },
          { name: '❌ Disable', value: 'off' }
        )
      )
      .addStringOption(o => o
        .setName('action')
        .setDescription('Action applied when triggered')
        .addChoices(
          { name: '⚠️ Warning (warn)',  value: 'warn' },
          { name: '🔇 Mute (10 min)',   value: 'mute' },
          { name: '👢 Kick',            value: 'kick' },
          { name: '🔨 Ban',             value: 'ban'  }
        )
      )
      .addIntegerOption(o => o.setName('threshold').setDescription('Trigger threshold').setMinValue(1).setMaxValue(100))
      .addIntegerOption(o => o.setName('interval').setDescription('Detection interval in seconds').setMinValue(1).setMaxValue(120))
    )
    .addSubcommand(sub => sub
      .setName('logs')
      .setDescription('Set the security log channel')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('Log channel')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
      )
    )
    .addSubcommand(sub => sub
      .setName('whitelist-role')
      .setDescription('Manage roles exempt from automatic detections')
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true))
      .addStringOption(o => o
        .setName('action')
        .setDescription('Add or remove from whitelist')
        .setRequired(true)
        .addChoices(
          { name: '➕ Add',    value: 'add'    },
          { name: '➖ Remove', value: 'remove' }
        )
      )
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '⛔ Permission required: **Manage Server**.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const { guild } = interaction;

    // ── Enable / Disable ─────────────────────────────────────────────────────
    if (sub === 'enable' || sub === 'disable') {
      const on = sub === 'enable';
      securityService.setConfig(guild.id, { enabled: on });

      const embed = new EmbedBuilder()
        .setColor(on ? 0x2ecc71 : 0x95a5a6)
        .setTitle(`🛡️  Security ${on ? 'Enabled' : 'Disabled'}`)
        .setDescription(on
          ? 'The security system is now **active**. All configured protections are running.'
          : 'The security system is **disabled**. No protections are running.')
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── Status ────────────────────────────────────────────────────────────────
    if (sub === 'status') {
      const cfg  = securityService.getConfig(guild.id);
      const bool = v => v ? '✅ Active' : '❌ Inactive';
      const whitelistRoles = Array.isArray(cfg.whitelist_roles) && cfg.whitelist_roles.length
        ? cfg.whitelist_roles.map(id => `<@&${id}>`).join(', ')
        : 'None';

      const embed = new EmbedBuilder()
        .setColor(cfg.enabled ? COLOR : 0x95a5a6)
        .setTitle('🛡️  Security Configuration — Ardavia')
        .setDescription(
          `**System:** ${cfg.enabled ? '✅ Active' : '❌ Inactive'}\n` +
          `**Interval:** ${cfg.intervalSeconds}s\n` +
          `**Logs:** ${cfg.logsChannelId ? `<#${cfg.logsChannelId}>` : 'Not configured'}`
        )
        .addFields(
          { name: PROTECTION_LABELS.antispam,    value: `${bool(cfg.antispam_enabled)}\nThreshold: ${cfg.antispam_threshold} msg → \`${cfg.antispam_action}\``,       inline: true },
          { name: PROTECTION_LABELS.antiraid,    value: `${bool(cfg.antiraid_enabled)}\nThreshold: ${cfg.antiraid_threshold} joins → \`${cfg.antiraid_action}\``,     inline: true },
          { name: PROTECTION_LABELS.antimention, value: `${bool(cfg.antimention_enabled)}\nThreshold: ${cfg.antimention_threshold} mentions → \`${cfg.antimention_action}\``, inline: true },
          { name: PROTECTION_LABELS.antibot,     value: `${bool(cfg.antibot_enabled)}\nAction: \`${cfg.antibot_action}\``,                                             inline: true },
          { name: '🤍 Whitelisted Roles',        value: whitelistRoles, inline: false }
        )
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ── Config ────────────────────────────────────────────────────────────────
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
        return interaction.reply({ content: '⚠️ No changes provided.', ephemeral: true });
      }

      securityService.setConfig(guild.id, updates);
      const cfg = securityService.getConfig(guild.id);

      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(`🛡️  ${PROTECTION_LABELS[protection]} — Configuration Updated`)
        .addFields(
          { name: '🔘 Status',    value: cfg[`${protection}_enabled`] ? '✅ Active' : '❌ Inactive', inline: true },
          { name: '⚡ Action',    value: `\`${cfg[`${protection}_action`] ?? 'N/A'}\``,               inline: true },
          ...(protection !== 'antibot' ? [{ name: '📊 Threshold', value: String(cfg[`${protection}_threshold`] ?? 'N/A'), inline: true }] : []),
          { name: '⏱️ Interval', value: `${cfg.intervalSeconds}s`, inline: true }
        )
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── Logs ──────────────────────────────────────────────────────────────────
    if (sub === 'logs') {
      const channel = interaction.options.getChannel('channel');
      securityService.setConfig(guild.id, { logsChannelId: channel.id });

      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('🛡️  Log Channel Set')
        .setDescription(`Security alerts will now be sent to ${channel}.`)
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ── Whitelist-role ────────────────────────────────────────────────────────
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
        .setTitle('🛡️  Whitelist Updated')
        .setDescription(`${role} has been **${action === 'add' ? 'added to' : 'removed from'}** the security whitelist.`)
        .setFooter({ text: FOOTER })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }
};
