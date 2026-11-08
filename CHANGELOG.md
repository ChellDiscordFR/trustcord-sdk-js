# CHANGELOG
> feat(sdk)!: lookup du bot avec utilisateur

## Changements notables

Le bot officiel pouvait consulter le registre sans limite pour le membre qui le lui demandait. Il indique maintenant à l'API qui consulte, et ce membre dépense la même allocation que sur le site : 10 recherches par minute et 100 par jour.

L'API publique ne dit plus si un compte appartient au staff de Trustcord, pour qu'aucun bot ne puisse repérer les jurés parmi les membres d'un serveur. Le client des développeurs ne renvoie donc plus ce rôle ; seul le client du bot officiel le reçoit encore.

## Liste complète des changements

- TrustcordBot.lookup(actingUserId, userId) : X-Trustcord-User envoyé, renvoie BotStatus
- types : staffRole retiré de Status, BotStatus ajouté ; mapping.botStatus
- README et tests : lookup du bot avec utilisateur, Status sans staffRole
