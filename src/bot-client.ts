import { Http, reportForm, validateUserId } from './http';
import { caseDetail, caseSummary, record, status, tally } from './mapping';
import type { WireCase, WireCaseDetail, WireRecord, WireStatus, WireTally } from './mapping';
import type { CaseDetail, CaseSummary, ClientOptions, ReportInput, ReportReceipt, SelfRecord, Status, Tally, VoteInput } from './types';

/** Reserved for the official Trustcord bot and its single bot key. */
export class TrustcordBot {
    private readonly http: Http;

    constructor(botKey: string, options?: ClientOptions) {
        this.http = new Http(`Bot ${botKey}`, options);
    }

    async lookup(userId: string): Promise<Status> {
        validateUserId(userId);
        return status(userId, await this.http.request<WireStatus>(`/bot/lookup/${userId}`));
    }

    async report(actingUserId: string, input: ReportInput): Promise<ReportReceipt> {
        return this.http.request('/bot/reports', 'POST', reportForm(input), actingUserId);
    }

    async cases(state: 'open' | 'recent'): Promise<CaseSummary[]> {
        const cases = await this.http.request<WireCase[]>(`/bot/cases?state=${encodeURIComponent(state)}`);
        return cases.map(caseSummary);
    }

    async caseDetail(actingUserId: string, caseId: string): Promise<CaseDetail> {
        return caseDetail(await this.http.request<WireCaseDetail>(
            `/bot/cases/${encodeURIComponent(caseId)}`, 'GET', undefined, actingUserId,
        ));
    }

    async vote(actingUserId: string, caseId: string, vote: VoteInput): Promise<Tally> {
        return tally(await this.http.request<WireTally>(
            `/bot/cases/${encodeURIComponent(caseId)}/vote`, 'POST', {
                approve: vote.approve,
                danger_level: vote.level,
                note: vote.note,
            }, actingUserId,
        ));
    }

    async record(actingUserId: string): Promise<SelfRecord> {
        return record(await this.http.request<WireRecord>('/bot/me/record', 'GET', undefined, actingUserId));
    }
}
