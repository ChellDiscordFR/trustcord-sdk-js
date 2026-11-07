import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEVELS, Trustcord, TrustcordBot, levelAtLeast } from '../src';
import { checkForm, receipt, report, userId } from './helpers';

test('lookup maps snake case, unix seconds (including zero), staff roles and defaults', async () => {
    for (const role of ['jury', 'admin', null]) {
        const api = new Trustcord('key', { fetch: async (url, init) => {
            assert.equal(url, `https://api.trustcord.org/v1/lookup/${userId}`);
            assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer key');
            return Response.json({ blacklisted: true, blacklistdate: 0, blacklistlevel: 'high', staff_role: role });
        } });
        assert.deepEqual(await api.lookup(userId), {
            userId, blacklisted: true, level: 'high', since: new Date(0), staffRole: role,
        });
    }
    const api = new Trustcord('key', { baseUrl: 'https://example.test/', userAgent: 'test-agent', fetch: async (url, init) => {
        assert.equal(url, `https://example.test/v1/lookup/${userId}`);
        assert.equal(new Headers(init?.headers).get('User-Agent'), 'test-agent');
        return Response.json({ blacklisted: false });
    } });
    assert.deepEqual(await api.lookup(userId), { userId, blacklisted: false, level: null, since: null, staffRole: null });
});

test('lookupMany deduplicates before chunking by 100 and returns a mapped Map', async () => {
    const ids = Array.from({ length: 205 }, (_, i) => String(123456789012345678n + BigInt(i)));
    const chunks: string[][] = [];
    const api = new Trustcord('key', { fetch: async (url, init) => {
        assert.equal(url, 'https://api.trustcord.org/v1/lookup');
        assert.equal(init?.method, 'POST');
        assert.equal(new Headers(init.headers).get('Content-Type'), 'application/json');
        assert.equal(typeof init.body, 'string');
        const body = JSON.parse(init.body as string) as { ids: string[] };
        chunks.push(body.ids);
        return Response.json(Object.fromEntries(body.ids.map(id => [id, {
            blacklisted: true, blacklistdate: 1758374400, blacklistlevel: 'medium', staff_role: 'jury',
        }])));
    } });
    assert.equal((await api.lookupMany([])).size, 0);
    const result = await api.lookupMany([...ids, ...ids]);
    assert.ok(result instanceof Map);
    assert.deepEqual(chunks.map(chunk => chunk.length), [100, 100, 5]);
    assert.deepEqual([...result.keys()], ids);
    assert.deepEqual(result.get(userId), {
        userId, blacklisted: true, level: 'medium', since: new Date(1758374400000), staffRole: 'jury',
    });
});

test('report repeats multipart fields and preserves filenames and contents', async () => {
    const api = new Trustcord('key', { fetch: async (url, init) => {
        assert.equal(url, 'https://api.trustcord.org/v1/reports');
        await checkForm(init);
        return Response.json(receipt, { status: 201 });
    } });
    assert.deepEqual(await api.report(report), receipt);
});

test('invalid snowflakes fail before network calls for lookup, bulk, report and acting user', async () => {
    const fetch: typeof globalThis.fetch = async () => { throw new Error('Unexpected request'); };
    const api = new Trustcord('key', { fetch });
    const bot = new TrustcordBot('key', { fetch });
    for (const id of ['', '1', '1234567890123456', '123456789012345678901', '1234567890123456x', ` ${userId}`]) {
        await assert.rejects(api.lookup(id), TypeError);
        await assert.rejects(bot.lookup(id), TypeError);
        await assert.rejects(api.lookupMany([userId, id]), TypeError);
        await assert.rejects(api.report({ ...report, userIds: [id] }), TypeError);
        await assert.rejects(bot.report(userId, { ...report, userIds: [id] }), TypeError);
        await assert.rejects(bot.record(id), TypeError);
    }
});

test('danger levels compare in severity order', () => {
    assert.deepEqual(LEVELS, ['low', 'medium', 'high']);
    assert.equal(levelAtLeast('high', 'medium'), true);
    assert.equal(levelAtLeast('medium', 'medium'), true);
    assert.equal(levelAtLeast('low', 'medium'), false);
});
