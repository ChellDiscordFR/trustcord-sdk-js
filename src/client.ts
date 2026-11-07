import { Http, reportForm, validateUserId } from './http';
import { status } from './mapping';
import type { WireStatus } from './mapping';
import type { ClientOptions, ReportInput, ReportReceipt, Status } from './types';

/** Application API key client for third-party integrations. */
export class Trustcord {
    private readonly http: Http;

    constructor(apiKey: string, options?: ClientOptions) {
        this.http = new Http(`Bearer ${apiKey}`, options);
    }

    async lookup(userId: string): Promise<Status> {
        validateUserId(userId);
        return status(userId, await this.http.request<WireStatus>(`/v1/lookup/${userId}`));
    }

    async lookupMany(userIds: string[]): Promise<Map<string, Status>> {
        const ids = [...new Set(userIds)];
        ids.forEach(validateUserId);
        const result = new Map<string, Status>();
        for (let start = 0; start < ids.length; start += 100) {
            const chunk = ids.slice(start, start + 100);
            const entries = await this.http.request<Record<string, WireStatus>>('/v1/lookup', 'POST', { ids: chunk });
            for (const userId of chunk) {
                const entry = entries[userId];
                if (entry === undefined) {
                    throw new TypeError(`Lookup response missing ${userId}`);
                }
                result.set(userId, status(userId, entry));
            }
        }
        return result;
    }

    async report(input: ReportInput): Promise<ReportReceipt> {
        return this.http.request('/v1/reports', 'POST', reportForm(input));
    }
}
