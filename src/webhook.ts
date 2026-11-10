// Webhook helpers: check that a notification comes from Trustcord, then match it.
// Trustcord posts the keyed hashes of the accounts whose listing was lifted or
// changed, never their IDs: hash the IDs you hold with your webhook secret and
// look those accounts up again.

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Seconds a notification stays acceptable, against replays. */
export const WEBHOOK_MAX_AGE = 300;

export interface WebhookNotification {
    event: 'accounts.changed';
    accounts: string[];
}

/** The hash Trustcord sends for this account, with your webhook secret. */
export function accountHash(secret: string, discordId: string): string {
    return createHmac('sha256', secret).update(discordId).digest('hex');
}

/**
 * True when the headers prove Trustcord sent this exact body recently.
 * `timestamp` is the `X-Trustcord-Timestamp` header, `signature` the
 * `X-Trustcord-Signature` header, `body` the raw request body.
 */
export function verifyWebhook(
    secret: string,
    body: string | Buffer,
    timestamp: string,
    signature: string,
    options: { maxAge?: number; now?: number } = {},
): boolean {
    if (!/^\d+$/.test(timestamp)) return false;
    const sent = Number(timestamp);
    const now = options.now ?? Date.now() / 1000;
    if (Math.abs(now - sent) > (options.maxAge ?? WEBHOOK_MAX_AGE)) return false;
    const digest = createHmac('sha256', secret)
        .update(`${sent}.`)
        .update(body)
        .digest('hex');
    const expected = Buffer.from(`sha256=${digest}`);
    const given = Buffer.from(signature);
    return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Your IDs whose hash appears in the notification: look these up again. */
export function changedAccounts(
    secret: string,
    accounts: readonly string[],
    discordIds: Iterable<string>,
): string[] {
    const wanted = new Set(accounts);
    return [...discordIds].filter((id) => wanted.has(accountHash(secret, id)));
}
