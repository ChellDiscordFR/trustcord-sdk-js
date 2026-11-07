import { responseError } from './errors';
import type { ClientOptions, ReportInput } from './types';

export function validateUserId(userId: string): void {
    if (typeof userId !== 'string' || !/^\d{17,20}$/.test(userId)) {
        throw new TypeError('Expected a Discord snowflake with 17 to 20 digits');
    }
}

export function reportForm(input: ReportInput): FormData {
    input.userIds.forEach(validateUserId);
    const form = new FormData();
    form.append('reason', input.reason);
    for (const userId of input.userIds) {
        form.append('discord_ids', userId);
    }
    for (const evidence of input.evidence) {
        const data = evidence.data instanceof Uint8Array
            ? new Uint8Array(evidence.data).buffer : evidence.data;
        const blob = data instanceof Blob && evidence.type === undefined
            ? data : new Blob([data], { type: evidence.type });
        form.append('files', blob, evidence.name);
    }
    return form;
}

export class Http {
    private readonly baseUrl: string;
    private readonly timeoutMs: number;
    private readonly fetcher: typeof fetch;
    readonly #authorization: string;
    private readonly userAgent: string | undefined;

    constructor(authorization: string, options: ClientOptions = {}) {
        const baseUrl = new URL(options.baseUrl ?? 'https://api.trustcord.org');
        if (baseUrl.username !== '' || baseUrl.password !== '' || !(
            baseUrl.protocol === 'https:' || (
                baseUrl.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname)
            )
        )) {
            throw new TypeError('Expected HTTPS or loopback HTTP without URL credentials');
        }
        this.baseUrl = baseUrl.href.replace(/\/+$/, '');
        this.timeoutMs = options.timeoutMs ?? 10_000;
        this.fetcher = options.fetch ?? globalThis.fetch;
        this.#authorization = authorization;
        this.userAgent = options.userAgent;
    }

    async request<T>(path: string, method = 'GET', body?: FormData | object, actingUserId?: string): Promise<T> {
        const headers = new Headers({ Authorization: this.#authorization });
        if (this.userAgent !== undefined) {
            headers.set('User-Agent', this.userAgent);
        }
        if (actingUserId !== undefined) {
            validateUserId(actingUserId);
            headers.set('X-Trustcord-User', actingUserId);
        }
        const multipart = body instanceof FormData;
        if (body !== undefined && !multipart) {
            headers.set('Content-Type', 'application/json');
        }
        const response = await this.fetcher(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: multipart ? body : body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!response.ok) {
            const text = await response.text();
            let detail: unknown = text;
            try {
                detail = JSON.parse(text) as unknown;
            } catch {
                // Gateways can return plain text instead of the API's JSON errors.
            }
            throw responseError(response, detail);
        }
        return await response.json() as T;
    }
}
