const { EmbedBuilder } = require('discord.js');
const { defaultCurrency } = require('../config');

function createEmbed({ title, description, fields = [], color = 0x1f8bfe, footer, timestamp = true }) {
  const embed = new EmbedBuilder().setColor(color);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);
  if (footer) embed.setFooter({ text: footer });
  if (timestamp) embed.setTimestamp();
  return embed;
}

function styledEmbed({ title, description, fields = [], color = 0x1862a6 }) {
  return createEmbed({ title, description, fields, color, footer: `Ardavia Council • ${defaultCurrency}` });
}

module.exports = { createEmbed, styledEmbed };
