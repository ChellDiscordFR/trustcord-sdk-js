import { Http, reportForm, validateUserId } from './http';
import { botStatus, caseDetail, caseSummary, record, tally } from './mapping';
import type { WireBotStatus, WireCase, WireCaseDetail, WireRecord, WireTally } from './mapping';
import type { BotStatus, CaseDetail, CaseSummary, ClientOptions, ReportInput, ReportReceipt, SelfRecord, Tally, VoteInput } from './types';

/** Reserved for the official Trustcord bot and its single bot key. */
export class TrustcordBot {
    private readonly http: Http;

    constructor(botKey: string, options?: ClientOptions) {
        this.http = new Http(`Bot ${botKey}`, options);
    }

    /** The acting user spends their own search allowance, shared with the website. */
    async lookup(actingUserId: string, userId: string): Promise<BotStatus> {
        validateUserId(userId);
        return botStatus(userId, await this.http.request<WireBotStatus>(
            `/bot/lookup/${userId}`, 'GET', undefined, actingUserId,
        ));
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
