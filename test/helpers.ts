import assert from 'node:assert/strict';
import type { ReportInput } from '../src';

export const userId = '123456789012345678';
export const otherId = '987654321098765432';
export const opened = '2026-10-01T12:30:00Z';
export const expires = '2026-10-08T12:30:00Z';
export const wireTally = {
    jury_size: 6, cast: 4, approvals: 3, refusals: 1,
    quorum_needed: 4, quorum_reached: true, approval_ratio: 0.75, admin_required: false,
};
export const expectedTally = {
    jurySize: 6, cast: 4, approvals: 3, refusals: 1,
    quorumNeeded: 4, quorumReached: true, approvalRatio: 0.75, adminRequired: false,
};
export const wireCase = {
    id: 'case-id', reference: 'OR-2026-0001', kind: 'blacklist', status: 'open',
    opened_at: opened, expires_at: expires, subject_discord_id: userId,
    subject_display: 'Subject', danger_level: null, tally: wireTally,
};
export const expectedCase = {
    id: 'case-id', reference: 'OR-2026-0001', kind: 'blacklist', status: 'open',
    openedAt: new Date(opened), expiresAt: new Date(expires), subjectId: userId,
    subjectDisplay: 'Subject', level: null, tally: expectedTally,
};
export const receipt = { reference: 'OR-2026-0001', targets: 2, message: 'Received' };
export const report: ReportInput = {
    userIds: [userId, otherId], reason: 'Report reason with enough context for the jury',
    evidence: [
        { name: 'one.png', data: new Uint8Array([1, 2]), type: 'image/png' },
        { name: 'two.jpg', data: new Uint8Array([3]).buffer, type: 'image/jpeg' },
        { name: 'three.txt', data: new Blob(['text'], { type: 'text/plain' }) },
    ],
};

export async function checkForm(init?: RequestInit): Promise<void> {
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).has('Content-Type'), false);
    assert.ok(init?.body instanceof FormData);
    assert.equal(init.body.get('reason'), report.reason);
    assert.deepEqual(init.body.getAll('discord_ids'), [userId, otherId]);
    const files = init.body.getAll('files');
    assert.equal(files.length, 3);
    for (const [index, entry] of files.entries()) {
        assert.ok(entry instanceof Blob);
        assert.equal('name' in entry ? entry.name : undefined, report.evidence[index]?.name);
    }
    assert.ok(files[0] instanceof Blob);
    assert.equal(files[0].type, 'image/png');
    assert.deepEqual([...new Uint8Array(await files[0].arrayBuffer())], [1, 2]);
    assert.ok(files[2] instanceof Blob);
    assert.equal(files[2].type, 'text/plain');
}
