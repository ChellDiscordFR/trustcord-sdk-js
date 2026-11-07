export class TrustcordError extends Error {
    constructor(readonly status: number, readonly detail: unknown) {
        super(typeof detail === 'string' ? detail : `Trustcord request failed (${status})`);
        this.name = new.target.name;
    }
}

export class Unauthorized extends TrustcordError {}
export class NotFound extends TrustcordError {}

export class RateLimited extends TrustcordError {
    constructor(detail: unknown, readonly retryAfter: number | null) {
        super(429, detail);
    }
}

export function responseError(response: Response, body: unknown): TrustcordError {
    const detail = typeof body === 'object' && body !== null && 'detail' in body
        ? body.detail : body;
    if (response.status === 401 || response.status === 403) {
        return new Unauthorized(response.status, detail);
    }
    if (response.status === 404) {
        return new NotFound(response.status, detail);
    }
    if (response.status === 429) {
        const header = response.headers.get('Retry-After');
        let retryAfter: number | null = null;
        if (header !== null && /^\d+(?:\.\d+)?$/.test(header.trim())) {
            retryAfter = Number(header);
        } else if (header !== null) {
            const date = Date.parse(header);
            if (Number.isFinite(date)) {
                retryAfter = Math.max(0, Math.ceil((date - Date.now()) / 1000));
            }
        }
        return new RateLimited(detail, retryAfter);
    }
    return new TrustcordError(response.status, detail);
}
