// Exemple de vérification par rôle spécifique
const adminRoleId = 'TON_ROLE_ID_ICI'; // Remplace par l'ID réel du rôle

if (!interaction.member.roles.cache.has(adminRoleId)) {
  return interaction.reply({
    content: '❌ Vous devez avoir le rôle **Admin** pour utiliser cette commande.',
    ephemeral: true
  });
}

// Exemple de vérification multiple (permission OU rôle)
const hasPermission = interaction.member.permissions.has('ManageGuild');
const hasRole = interaction.member.roles.cache.has(adminRoleId);

if (!hasPermission && !hasRole) {
  return interaction.reply({
    content: '❌ Vous devez avoir la permission **"Gérer le serveur"** ou le rôle **Admin**.',
    ephemeral: true
  });
}