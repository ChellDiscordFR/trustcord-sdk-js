import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { accountHash, changedAccounts, verifyWebhook } from '../src';

const SECRET = 'webhook-secret';
const BODY = '{"event":"accounts.changed","accounts":[]}';
const NOW = 1_800_000_000;

function signature(timestamp: number, body: string = BODY): string {
    const digest = createHmac('sha256', SECRET).update(`${timestamp}.${body}`).digest('hex');
    return `sha256=${digest}`;
}

test('a valid signature is accepted', () => {
    assert.equal(verifyWebhook(SECRET, BODY, String(NOW), signature(NOW), { now: NOW }), true);
});

test('a tampered body, a wrong secret or a malformed timestamp is refused', () => {
    assert.equal(verifyWebhook(SECRET, `${BODY} `, String(NOW), signature(NOW), { now: NOW }), false);
    assert.equal(verifyWebhook('other', BODY, String(NOW), signature(NOW), { now: NOW }), false);
    assert.equal(verifyWebhook(SECRET, BODY, 'soon', signature(NOW), { now: NOW }), false);
});

test('an old notification is refused', () => {
    const old = NOW - 301;
    assert.equal(verifyWebhook(SECRET, BODY, String(old), signature(old), { now: NOW }), false);
});

test('changedAccounts returns only the matching ids', () => {
    const accounts = [accountHash(SECRET, '123456789012345678')];
    assert.deepEqual(
        changedAccounts(SECRET, accounts, ['123456789012345678', '234567890123456789']),
        ['123456789012345678'],
    );
});
