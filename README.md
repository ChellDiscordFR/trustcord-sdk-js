# trustcord-sdk

TypeScript and JavaScript clients for Trustcord. Node.js >= 20, with no runtime
dependencies. Keep application and bot keys server side.

```sh
npm install trustcord-sdk
```

## Application client

Third-party integrations use an application API key and the `/v1` routes.

```ts
import { Trustcord, levelAtLeast } from 'trustcord-sdk';

const api = new Trustcord(process.env.TRUSTCORD_API_KEY!);
const status = await api.lookup('123456789012345678');
if (status.blacklisted && status.level && levelAtLeast(status.level, 'medium')) {
    console.log(status.level, status.since);
}
console.log(status.staffRole); // 'jury', 'admin' or null, even if not listed.
const members = await api.lookupMany(['123456789012345678', '987654321098765432']);
console.log(members.get('123456789012345678'));

const receipt = await api.report({
    userIds: ['123456789012345678'],
    reason: 'Describe what happened with enough context for the jury.',
    evidence: [{ name: 'capture.png', data: screenshotBytes, type: 'image/png' }],
});
console.log(receipt.reference);
```

`screenshotBytes` is a `Uint8Array`, `ArrayBuffer` or `Blob` containing the evidence.
The API validates report contents and evidence. `lookupMany` deduplicates IDs,
requests batches of at most 100, and returns a `Map<string, Status>`. An empty
list makes no request. Lookup and report IDs must have 17 to 20 digits or the
SDK rejects with `TypeError`. Levels are `low`, `medium`, `high`, mildest first.
Staff roles identify active staff; they do not attest to NDA acceptance.

CommonJS consumers can use `const { Trustcord } = require('trustcord-sdk')`.
The same compiled CommonJS package supports named ESM imports and includes types.

## Official bot client

`TrustcordBot` is reserved to the official Trustcord bot. Third-party bots must
use `Trustcord`, and cannot act on behalf of users with an application key.

```ts
import { TrustcordBot } from 'trustcord-sdk';

const bot = new TrustcordBot(process.env.TRUSTCORD_BOT_KEY!);
const actingUserId = '123456789012345678';
const cases = await bot.cases('open'); // Or 'recent'.
if (cases[0]) {
    const detail = await bot.caseDetail(actingUserId, cases[0].id);
    const tally = await bot.vote(actingUserId, detail.id, {
        approve: true,
        level: 'medium',
    });
    console.log(tally.quorumReached);
}
const record = await bot.record(actingUserId);
const status = await bot.lookup(actingUserId);
// bot.report(actingUserId, input) accepts the same ReportInput as api.report().
```

The bot authenticates with `Authorization: Bot <key>` and sends the acting user
in `X-Trustcord-User` for report, detail, vote and record calls. The backend
checks juror/admin permissions and NDA acceptance for details and votes. Show
case reasons only to authorized jurors in ephemeral messages. Evidence must
never pass through Discord.

## Options and errors

Both constructors accept `{ baseUrl, timeoutMs, fetch, userAgent }`. The default
base URL is `https://api.trustcord.org`; the default timeout is 10 seconds.
Supply `fetch` to inject a compatible transport for tests. Requests use
`AbortSignal.timeout`; timeout errors retain the native `TimeoutError` name.
Network errors propagate, with no automatic retry of reports or votes.

Wire fields are snake_case; SDK fields are camelCase. Dates become `Date`
objects, including lookup timestamps supplied as Unix seconds. Absent lookup
role, level and date fields become `null` for compatibility with older servers.

API errors extend `TrustcordError` with `status` and `detail`:

| Error | Status | Extra |
| --- | --- | --- |
| `Unauthorized` | 401, 403 | Invalid key or acting user not authorized |
| `NotFound` | 404 | Unknown resource |
| `RateLimited` | 429 | `retryAfter`: seconds, or `null` if missing/invalid |
| `TrustcordError` | Other failures | Original error detail |

`Retry-After` accepts seconds or an HTTP date. Error detail retains structured
validation errors; plain text gateway responses are also preserved.

## Notice obligation

GDPR article 14 requires your bot to inform a person when it uses registry data
to restrict them in a server, at the latest at their first interaction. Explain
the restriction and link to `https://trustcord.org/notice` and their record
on the Trustcord site. Do not sanction someone for a pending accusation.

## Development

```sh
npm install
npm run build
npm test
npm pack --dry-run
```

`build` compiles strict TypeScript to CommonJS and declarations in `dist/`.
`test` runs `node:test` through `tsx` with injected fake fetch implementations.
`prepublishOnly` runs the build and tests. Only `dist/`, this README and package
metadata are published. License: MIT.
