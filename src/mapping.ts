import type { CaseDetail, CaseSummary, SelfRecord, Status, Tally } from './types';

export interface WireStatus {
    blacklisted: boolean;
    blacklistlevel?: Status['level'];
    blacklistdate?: number | null;
    staff_role?: Status['staffRole'];
}

export function status(userId: string, wire: WireStatus): Status {
    return {
        userId,
        blacklisted: wire.blacklisted,
        level: wire.blacklistlevel ?? null,
        since: wire.blacklistdate == null ? null : new Date(wire.blacklistdate * 1000),
        staffRole: wire.staff_role ?? null,
    };
}

export interface WireTally {
    jury_size: number;
    cast: number;
    approvals: number;
    refusals: number;
    quorum_needed: number;
    quorum_reached: boolean;
    approval_ratio: number;
    admin_required: boolean;
}

export function tally(wire: WireTally): Tally {
    return {
        jurySize: wire.jury_size,
        cast: wire.cast,
        approvals: wire.approvals,
        refusals: wire.refusals,
        quorumNeeded: wire.quorum_needed,
        quorumReached: wire.quorum_reached,
        approvalRatio: wire.approval_ratio,
        adminRequired: wire.admin_required,
    };
}

export interface WireCase {
    id: string;
    reference: string;
    kind: CaseSummary['kind'];
    status: CaseSummary['status'];
    opened_at: string;
    expires_at: string | null;
    subject_discord_id: string;
    subject_display: string;
    danger_level: CaseSummary['level'];
    tally: WireTally;
}

export function caseSummary(wire: WireCase): CaseSummary {
    return {
        id: wire.id,
        reference: wire.reference,
        kind: wire.kind,
        status: wire.status,
        openedAt: new Date(wire.opened_at),
        expiresAt: wire.expires_at === null ? null : new Date(wire.expires_at),
        subjectId: wire.subject_discord_id,
        subjectDisplay: wire.subject_display,
        level: wire.danger_level,
        tally: tally(wire.tally),
    };
}

export interface WireCaseDetail extends WireCase {
    reason: string | null;
    evidence_count: number;
    my_vote: boolean | null;
}

export function caseDetail(wire: WireCaseDetail): CaseDetail {
    return {
        ...caseSummary(wire),
        reason: wire.reason,
        evidenceCount: wire.evidence_count,
        myVote: wire.my_vote,
    };
}

export interface WireRecord {
    discord_id: string;
    blacklisted: boolean;
    level: SelfRecord['level'];
    blacklisted_at: string | null;
    expires_at: string | null;
    grounds_count: number;
    open_cases: number;
    can_appeal: boolean;
    appeal_status: SelfRecord['appealStatus'];
    informed_at: string | null;
}

export function record(wire: WireRecord): SelfRecord {
    return {
        userId: wire.discord_id,
        blacklisted: wire.blacklisted,
        level: wire.level,
        blacklistedAt: wire.blacklisted_at === null ? null : new Date(wire.blacklisted_at),
        expiresAt: wire.expires_at === null ? null : new Date(wire.expires_at),
        groundsCount: wire.grounds_count,
        openCases: wire.open_cases,
        canAppeal: wire.can_appeal,
        appealStatus: wire.appeal_status,
        informedAt: wire.informed_at === null ? null : new Date(wire.informed_at),
    };
}
