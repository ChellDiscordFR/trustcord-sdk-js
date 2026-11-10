# CHANGELOG
> feat(sdk): vérification du webhook de mise à jour

## Changements notables

Un bot qui gardait en mémoire les réponses du registre n'apprenait jamais qu'une inscription avait été levée ou que son niveau avait changé. Trustcord peut maintenant le prévenir par un webhook, et le SDK fournit de quoi vérifier que la notification vient bien de Trustcord et retrouver, parmi les comptes que le bot connaît, ceux à consulter de nouveau. La notification ne contient jamais d'identifiant en clair.

## Liste complète des changements

- webhook : verifyWebhook (signature, fenêtre de 300 secondes), accountHash, changedAccounts, type WebhookNotification
- index : exports du module webhook
- README : section webhook de mise à jour
- tests : webhook.test.ts
