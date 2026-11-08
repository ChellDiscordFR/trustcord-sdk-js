import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspect } from 'node:util';
import { NotFound, Trustcord, TrustcordBot, TrustcordError, RateLimited, Unauthorized } from '../src';
import { userId } from './helpers';

test('inspection never exposes either client API key, even after a request', async () => {
    for (const Client of [Trustcord, TrustcordBot]) {
        const api = new Client('SECRETKEY123', { fetch: async (_url, init) => {
            const scheme = Client === Trustcord ? 'Bearer' : 'Bot';
            assert.equal(new Headers(init?.headers).get('Authorization'), `${scheme} SECRETKEY123`);
            return Response.json({ blacklisted: false });
        } });
        assert.equal(inspect(new Client('SECRETKEY123'), { depth: 10 }).includes('SECRETKEY123'), false);
        assert.equal(inspect(api, { depth: 10 }).includes('SECRETKEY123'), false);
        await (api instanceof TrustcordBot ? api.lookup(userId, userId) : api.lookup(userId));
        assert.equal(inspect(api, { depth: 10 }).includes('SECRETKEY123'), false);
    }
});

test('HTTPS and loopback HTTP base URLs are accepted by both clients', async () => {
    for (const Client of [Trustcord, TrustcordBot]) {
        for (const baseUrl of [
            'https://api.trustcord.org', 'https://example.test:8443/api/',
            'http://127.0.0.1:8000', 'http://localhost:8000', 'http://[::1]:8000',
        ]) {
            const api = new Client('key', { baseUrl, fetch: async (url) => {
                const path = Client === Trustcord ? '/v1/lookup/' : '/bot/lookup/';
                assert.equal(url, `${baseUrl.replace(/\/+$/, '')}${path}${userId}`);
                return Response.json({ blacklisted: false });
            } });
            await (api instanceof TrustcordBot ? api.lookup(userId, userId) : api.lookup(userId));
        }
    }
});

test('unsafe base URLs are refused at construction by both clients', () => {
    for (const Client of [Trustcord, TrustcordBot]) {
        for (const baseUrl of [
            'http://api.trustcord.org', 'http://localhost.evil.test',
            'https://user:pass@host', 'https://user@host', 'https://:pass@host',
            'http://user:pass@localhost', 'ftp://host', '', '/relative',
        ]) {
            assert.throws(() => new Client('key', { baseUrl }), TypeError);
        }
    }
});

test('API errors preserve detail and map 401, 403, 404, 429 and other statuses', async () => {
    for (const [status, ErrorClass] of [
        [401, Unauthorized], [403, Unauthorized], [404, NotFound],
        [429, RateLimited], [409, TrustcordError], [422, TrustcordError],
    ] as const) {
        const detail = { reason: 'refused' };
        const api = new Trustcord('key', { fetch: async () => Response.json({ detail }, {
            status, headers: { 'Retry-After': '42' },
        }) });
        await assert.rejects(api.lookup(userId), (error: unknown) => {
            assert.ok(error instanceof ErrorClass);
            assert.equal(error.status, status);
            assert.deepEqual(error.detail, detail);
            if (error instanceof RateLimited) {
                assert.equal(error.retryAfter, 42);
            }
            return true;
        });
    }
});

test('Retry-After missing or invalid is null, zero is preserved, HTTP dates yield seconds', async () => {
    for (const header of [null, 'invalid', '0', new Date(Date.now() + 60_000).toUTCString()]) {
        const api = new Trustcord('key', { fetch: async () => Response.json({ detail: 'quota' }, {
            status: 429, headers: header === null ? {} : { 'Retry-After': header },
        }) });
        await assert.rejects(api.lookup(userId), (error: unknown) => {
            assert.ok(error instanceof RateLimited);
            if (header === null || header === 'invalid') {
                assert.equal(error.retryAfter, null);
            } else if (header === '0') {
                assert.equal(error.retryAfter, 0);
            } else {
                assert.ok(error.retryAfter !== null && error.retryAfter >= 59 && error.retryAfter <= 60);
            }
            return true;
        });
    }
});

test('plain text gateway errors still carry status and detail', async () => {
    const api = new Trustcord('key', { fetch: async () => new Response('gateway down', { status: 502 }) });
    await assert.rejects(api.lookup(userId), (error: unknown) => {
        assert.ok(error instanceof TrustcordError);
        assert.equal(error.status, 502);
        assert.equal(error.detail, 'gateway down');
        return true;
    });
});

test('timeout aborts the injected fetch', async () => {
    let aborted = false;
    const api = new Trustcord('key', { timeoutMs: 5, fetch: async (_url, init) => {
        const signal = init?.signal;
        assert.ok(signal);
        return new Promise<Response>((resolve, reject) => {
            const timer = setTimeout(() => resolve(Response.json({ blacklisted: false })), 1000);
            signal.addEventListener('abort', () => {
                aborted = true;
                clearTimeout(timer);
                reject(signal.reason);
            }, { once: true });
        });
    } });
    await assert.rejects(api.lookup(userId), { name: 'TimeoutError' });
    assert.equal(aborted, true);
});
