# Ardavia Council

Bot Discord RP immersif pour serveur Emergency Response Roblox.

## Fonctionnalités

- Séparation RP / HRP
- Système gouvernemental réaliste avec votes parlementaires
- Économie complète et banque immersive
- Licences métiers et autorisations
- Protection anti-raid configurable
- Système de tickets staff privé
- Commandes slash stylées avec embeds et boutons

## Installation

1. Double-cliquez sur `install.bat` pour installer les dépendances (une seule fois)
2. Copiez `.env.example` vers `.env` et renseignez les valeurs
3. Invitez le bot avec ce lien (remplacez CLIENT_ID) :
   ```
   https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=268435456&scope=bot%20applications.commands
   ```
4. Double-cliquez sur `start.bat` pour lancer le bot

## Scripts

- `install.bat` : installe les dépendances (à faire une seule fois)
- `start.bat` : lance le bot (après installation)

## Configuration

Variables attendues dans `.env`:

- `TOKEN` : token du bot Discord
- `CLIENT_ID` : ID de l’application bot
- `GUILD_ID` : ID du serveur de test (recommandé pour un enregistrement rapide des commandes)
- `LOGS_CHANNEL_ID` : ID du salon de logs anti-raid et actions sensibles
- `DEFAULT_CURRENCY` : nom de la monnaie RP
- `PARLIAMENT_ROLE_ID` : ID du rôle parlementaire initial (optionnel)

## Structure projet

- `src/index.js` : démarrage du bot + enregistrement des commandes
- `src/events/` : gestion des events Discord
- `src/commands/` : commandes modulaires
- `src/services/` : logique métier, base de données, système anti-raid

## Suggestions V2

- Ajouter un module métier (`/job hire`, `/job promote`)
- Augmenter le système bancaire avec prêts et intérêts dynamiques
- Complexifier la gouvernance avec ressources, lois et commissions
- Faire une interface de configuration RP via un panneau d’administration
