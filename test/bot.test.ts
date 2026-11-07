import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TrustcordBot } from '../src';
import {
    checkForm, expectedCase, expectedTally, expires, opened, receipt, report,
    userId, wireCase, wireTally,
} from './helpers';

test('bot lookup and cases use Bot auth without an acting user', async () => {
    const paths: string[] = [];
    const bot = new TrustcordBot('secret', { fetch: async (url, init) => {
        const headers = new Headers(init?.headers);
        assert.equal(headers.get('Authorization'), 'Bot secret');
        assert.equal(headers.has('X-Trustcord-User'), false);
        paths.push(String(url));
        if (String(url).includes('/lookup/')) {
            return Response.json({ blacklisted: false, staff_role: 'admin' });
        }
        return Response.json([wireCase, { ...wireCase, expires_at: null, kind: 'unblacklist', status: 'escalated' }]);
    } });
    assert.deepEqual(await bot.lookup(userId), {
        userId, blacklisted: false, level: null, since: null, staffRole: 'admin',
    });
    for (const state of ['open', 'recent'] as const) {
        assert.deepEqual(await bot.cases(state), [
            expectedCase, { ...expectedCase, expiresAt: null, kind: 'unblacklist', status: 'escalated' },
        ]);
    }
    assert.deepEqual(paths, [
        `https://api.trustcord.org/bot/lookup/${userId}`,
        'https://api.trustcord.org/bot/cases?state=open',
        'https://api.trustcord.org/bot/cases?state=recent',
    ]);
});

test('bot detail, votes, record and report carry acting user and map wire fields', async () => {
    const paths: string[] = [];
    const wireRecord = {
        discord_id: userId, blacklisted: true, level: 'medium', blacklisted_at: opened,
        expires_at: expires, grounds_count: 2, open_cases: 1, can_appeal: true,
        appeal_status: 'rejected', informed_at: opened,
    };
    const bot = new TrustcordBot('secret', { fetch: async (url, init) => {
        const headers = new Headers(init?.headers);
        assert.equal(headers.get('Authorization'), 'Bot secret');
        assert.equal(headers.get('X-Trustcord-User'), userId);
        const path = new URL(String(url)).pathname;
        paths.push(path);
        if (path.endsWith('/vote')) {
            assert.equal(init?.method, 'POST');
            assert.equal(headers.get('Content-Type'), 'application/json');
            assert.equal(init?.body, JSON.stringify({ approve: true, danger_level: 'high', note: 'Checked' }));
            return Response.json(wireTally);
        }
        if (path.endsWith('/record')) {
            return Response.json(wireRecord);
        }
        if (path.endsWith('/reports')) {
            await checkForm(init);
            return Response.json(receipt);
        }
        return Response.json({ ...wireCase, reason: 'Reason', evidence_count: 3, my_vote: false });
    } });
    assert.deepEqual(await bot.caseDetail(userId, 'case/id'), {
        ...expectedCase, reason: 'Reason', evidenceCount: 3, myVote: false,
    });
    assert.deepEqual(await bot.vote(userId, 'case/id', { approve: true, level: 'high', note: 'Checked' }), expectedTally);
    assert.deepEqual(await bot.record(userId), {
        userId, blacklisted: true, level: 'medium', blacklistedAt: new Date(opened),
        expiresAt: new Date(expires), groundsCount: 2, openCases: 1, canAppeal: true,
        appealStatus: 'rejected', informedAt: new Date(opened),
    });
    assert.deepEqual(await bot.report(userId, report), receipt);
    assert.deepEqual(paths, ['/bot/cases/case%2Fid', '/bot/cases/case%2Fid/vote', '/bot/me/record', '/bot/reports']);
});

test('bot optional vote fields are omitted, detail and record nulls are retained', async () => {
    const bot = new TrustcordBot('secret', { fetch: async (url, init) => {
        if (String(url).endsWith('/vote')) {
            assert.equal(init?.body, '{"approve":false}');
            return Response.json(wireTally);
        }
        if (String(url).endsWith('/record')) {
            return Response.json({
                discord_id: userId, blacklisted: false, level: null, blacklisted_at: null,
                expires_at: null, grounds_count: 0, open_cases: 0, can_appeal: false,
                appeal_status: null, informed_at: null,
            });
        }
        return Response.json({ ...wireCase, reason: null, evidence_count: 0, my_vote: null });
    } });
    assert.deepEqual(await bot.vote(userId, 'case', { approve: false }), expectedTally);
    assert.deepEqual(await bot.caseDetail(userId, 'case'), {
        ...expectedCase, reason: null, evidenceCount: 0, myVote: null,
    });
    assert.deepEqual(await bot.record(userId), {
        userId, blacklisted: false, level: null, blacklistedAt: null, expiresAt: null,
        groundsCount: 0, openCases: 0, canAppeal: false, appealStatus: null, informedAt: null,
    });
});
