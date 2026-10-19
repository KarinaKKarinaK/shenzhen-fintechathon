# Contributing

## Setup

```
cd web
pnpm install
cp .env.example .env     # optional, the app runs without it
pnpm dev                 # localhost:3000
```

Contracts need Foundry:

```
curl -L https://foundry.paradigm.xyz | bash && foundryup
cd contracts && forge test
```

`forge-std` is vendored in `contracts/lib`. If it is missing, `forge install foundry-rs/forge-std`.

## Before you push

Run all four from `web`:

```
pnpm lint
npx tsc --noEmit
pnpm test
pnpm build
```

And `forge test` from `contracts` if you touched Solidity or `web/src/engine/contracts.ts` (the mirror must keep the same rules and numbers).

CI runs the same set. A failing check blocks the merge.

## Rules of the code

- Decisions are code. The model writes text and reads fields; it never names a payee or an amount and never holds a key.
- Every UI string goes through `useLang()`. Add the key to both `web/src/i18n/en.ts` and `zh.ts`, in correct Simplified Chinese.
- Rule ids and event `t` values are English and stable. Do not rename them without updating `selfcheck.ts`, the attack set and the docs.
- New engine behaviour gets a case in `attacks.ts` or an assertion in `selfcheck.ts`.
- Keep the mirror and the contracts in step. Change the rule table in both or in neither.
- Secrets never enter git. `.env*` is ignored; `.env.example` holds names and comments only.

## Writing

Plain language, short sentences, tables over prose. No em dashes, no emojis, no AI attribution lines anywhere (code, commits, docs). English first, Chinese for every user facing string.

## Commits

Plain messages that say what changed and why, in one line, imperative mood:

```
Hold the fee when the flight log fails the anomaly model
```

No attribution trailers, no co-author lines, no em dashes, no emojis. One change per commit where it is practical. Do not commit `evidence/` runs unless they are the ones the README cites.

## Layout

See `web/README.md` for the folder map and `TECHNICAL.md` for how the parts fit.
