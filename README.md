# JiXin (机信)

[![CI](https://github.com/KarinaKKarinaK/shenzhen-fintechathon/actions/workflows/ci.yml/badge.svg)](https://github.com/KarinaKKarinaK/shenzhen-fintechathon/actions/workflows/ci.yml)

Entry to the 2026 Shenzhen International FinTech Competition (FinTechathon), International Track, Topic F. Theme: "AI as a Financial Participant".

A wallet for machines. A machine earns per verified unit of work, pays its lender and other agents, keeps a bond that is slashed on cryptographic proof of a rule break, and owns itself once the lease is paid. The demo is an agricultural drone on hire purchase.

## The app

- Home: who it is for, how one task flows, the competition requirements mapped to code.
- Dashboard (`/app`): attack count at request time, the live policy caps, the six stages.
- Fleet (`/app/fleet`): the drone run. Economics check, a declined job, paid flights, a faked log held, a slash by proof, title transfer.
- Neighbour (`/app/neighbour`): a humanoid cleaning a flat. Judge gate on the request, bond earned in from the fee, a redirect blocked, a slash, a top up through the button.
- Evidence (`/app/evidence`): the attack lab. The attack set and the benign set run at request time, the naive comparison, a judge console to type your own attack, chain mode and model mode shown as they are.

Every panel draws from the engine's event stream. The UI computes no number.

## Chain mode

Simulated with labelled hashes unless `SURETY_PRIVATE_KEY` and `DEMO_TOKEN` are set. With them, every event is anchored on Base Sepolia as a self transfer with the event as calldata, and each card links to the explorer. The contracts in `contracts/` are written and tested in CI, not deployed; the engine mirrors their rules in memory.

## Run it

```
cd web
pnpm install
pnpm dev          # app on localhost:3000
pnpm test         # attack set blocked, benign set passes, normal flow allowed
pnpm evidence     # writes a full run and the attack results to evidence/
pnpm verify       # checks every hash in evidence/ against the chain or the labelled set
cd ../contracts && forge test
```

Environment is optional, see `web/.env.example`. An AI gateway or Anthropic key lets the model write the agents' explanations; decisions stay in code either way.

## Layout

- `web/src/engine`: policy engine, framing and judge gate, contract mirrors, agents, model wrapper, attack set, scenarios, chain adapter, selfcheck.
- `web/src/app/api`: `run` streams a scenario as server sent events, `judge` is the console, `attacks` returns the results.
- `web/src/components`: scene, panels, stages, graphs, attack grid, judge console, run hook.
- `contracts`: `IBonded`, `Bond`, `JobBoard`, `Lease` with Foundry tests. See `contracts/README.md`.

## Deliverables

1. Technical documentation: `TECHNICAL.md`.
2. Security self-assessment: `SELF_ASSESSMENT.md`.
3. Execution evidence: `evidence/` (run log, attack results, hashes).
4. Contracts: `contracts/README.md`.
5. Video: `web/public/demo.mp4` (placeholder, record before submitting).
6. Deck: `deck.pdf` (placeholder, cut from `BONDED_AGENT.md`).

## Other files

- `BONDED_AGENT.md`: the idea, with the built and not built table at the top.
- `HACKATHON.md`: rules, scoring, deadlines, contacts, deployment note.
- `FINAL_IDEAS.md`, `FIELD_REVIEW.md`, `COMPETITION.md`, `JUDGE_REVIEW.md`, `IDEAS.md`, `CORE_IDEA.md`, `PLAN.md`: competitor analysis and planning.

Repository visibility: the competitor analysis files above are in this repo. Decide before submitting whether they stay in a public repo or move out.

## Status

- [x] Idea chosen
- [x] Policy engine, framing, judge gate, contract mirrors, chain adapter
- [x] Attack set, benign set, selfcheck
- [x] Contracts written and tested in CI
- [x] Technical doc and self-assessment
- [ ] Deployment re-pointed (see `HACKATHON.md`)
- [ ] Funded key set so the evidence run has real hashes
- [ ] Demo video recorded
- [ ] Deck
- [ ] Team locked, passports collected, eligibility confirmed
- [ ] Submitted
