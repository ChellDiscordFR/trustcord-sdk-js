export type Level = 'low' | 'medium' | 'high';
export const LEVELS: readonly Level[] = Object.freeze(['low', 'medium', 'high']);

export function levelAtLeast(level: Level, minimum: Level): boolean {
    return LEVELS.indexOf(level) >= LEVELS.indexOf(minimum);
}

export type StaffRole = 'jury' | 'admin';

export interface Status {
    userId: string;
    blacklisted: boolean;
    level: Level | null;
    since: Date | null;
    staffRole: StaffRole | null;
}

export interface Evidence {
    name: string;
    data: Uint8Array | ArrayBuffer | Blob;
    type?: string;
}

export interface ReportInput {
    userIds: string[];
    reason: string;
    evidence: Evidence[];
}

export interface ReportReceipt {
    reference: string;
    targets: number;
    message: string;
}

export interface ClientOptions {
    baseUrl?: string;
    timeoutMs?: number;
    fetch?: typeof fetch;
    userAgent?: string;
}

export type CaseKind = 'blacklist' | 'unblacklist';
export type CaseStatus = 'open' | 'accepted' | 'rejected' | 'escalated' | 'expired' | 'withdrawn' | 'ignored';

export interface Tally {
    jurySize: number;
    cast: number;
    approvals: number;
    refusals: number;
    quorumNeeded: number;
    quorumReached: boolean;
    approvalRatio: number;
    adminRequired: boolean;
}

export interface CaseSummary {
    id: string;
    reference: string;
    kind: CaseKind;
    status: CaseStatus;
    openedAt: Date;
    expiresAt: Date | null;
    subjectId: string;
    subjectDisplay: string;
    level: Level | null;
    tally: Tally;
}

export interface CaseDetail extends CaseSummary {
    reason: string | null;
    evidenceCount: number;
    myVote: boolean | null;
}

export interface VoteInput {
    approve: boolean;
    level?: Level;
    note?: string;
}

export interface SelfRecord {
    userId: string;
    blacklisted: boolean;
    level: Level | null;
    blacklistedAt: Date | null;
    expiresAt: Date | null;
    groundsCount: number;
    openCases: number;
    canAppeal: boolean;
    appealStatus: 'open' | 'accepted' | 'rejected' | null;
    informedAt: Date | null;
}
