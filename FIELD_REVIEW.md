# Field review: our ideas against the competitor repos

19 October 2026. Every repo linked in COMPETITION.md was cloned and read file by file (nothing was run). Two of three groups are done: the ten wallet and mandate repos, and the eleven Topic A, B and C repos. The Topic D and E group plus a fresh GitHub search will be added when finished.

## Short answer

None of our seven candidates is built by anyone in the field. Across 21 repos:

| Our idea | Anyone doing it | Closest thing found |
|---|---|---|
| Bonded Agent (agent posts a bond, slashed on breach, buys liability cover) | Nobody | Agent Credit Bureau demotes an agent's tier and freezes it on chain, but no money at risk. Signet refuses execution without a valid certificate, but no stake. |
| Sky Cover (machine buys per-flight cover from an insurer agent, telemetry settles) | Nobody | No drone, oracle or premium pricing anywhere |
| Hidden Coverage (coverage map, add-on blocker, claim split, no double recovery) | Nobody | YINGLONG has an escrow coverage gap card. fundbun finds duplicate subscriptions. carrypay reconciles one bill. |
| Minimal Disclosure (agents negotiate the minimum data for a credit decision) | Partial, one repo | YINGLONG proves mandate compliance with a zero knowledge enforcer. carrypay tokenises PII before the model. Bluefin issues a signed payment passport. Nobody negotiates. |
| Honeypot Guardian (engage the scammer, extract the mule account, shared blocklist) | Nobody | Every scam handler refuses and logs. Three repos are called Guardian Wallet. |
| Prepaid Guard (escrow released per visit, refund on deregistration) | Partial, four repos | Milestone escrow with refund paths in agentic-wallet, AegisPay, Agent Credit Bureau, YINGLONG. None per visit or consumer prepaid. |
| Hard Button (dedicated device holds the only key, top tier is a physical press) | Partial, one repo | YINGLONG verifies phone passkeys on chain. Nobody has a physical device. |

## What is table stakes now

Any entry built only on these scores low on innovation however well it is made:

- The model proposes, deterministic code decides
- Permission tiers with caps and allowlists
- Mandates or session keys on chain, milestone escrow
- Scam detection that refuses and warns a trusted contact
- Passkey or PIN for the top tier
- Hash chained audit log, red team test suite, FISCO anchoring

## Structural gaps nobody fills

- All 21 agents are single party assistants. No repo has two agents transacting with their own incentives, even though the theme is "AI as a Financial Participant".
- Nobody gives the agent consequences. No bond, stake, insurance or liability. Every design stops at refuse and log.
- Nobody moves real value on a public chain inside the scenario. Chains anchor hashes, mostly on private FISCO nodes a judge cannot check. Six of ten wallet repos have thin or no public testnet proof. The Topic F entries in the A, B, C group have zero live transactions.
- Injection defense is a regex or keyword list in nearly every repo. Only YINGLONG (structural: the model cannot emit an address) and Bluefin (taint tracking) have real answers.
- Scam handling is always passive.
- Evidence and media are missing in most repos: videos on YouTube or Google Drive (blocked in the mainland), evidence folders empty or git ignored, READMEs that claim more than the code.
- One entry (siammds Guardian_Wallet) hardcodes borrowed Sepolia hashes and reports 15,000 gas, below the Ethereum minimum. Judges will check hashes.

## The bars we must match or beat

| Repo | What they do that we must match or beat |
|---|---|
| taivnaaiwnl/shenzhen-comp (Agent Credit Bureau, F) | The complete evidence package: a public Base Sepolia run with one transaction per claim, an offline verify script, a finished five minute video, a deck on the official template. Match the one hash per claim discipline. |
| ABRUBAB/YINGLONG (F) | Rules compiled into on-chain caveat enforcers, the model structurally cannot name an address, tiers can only go up, 391 contract tests. Beat it on clarity and on public chain evidence, where it has one transaction. |
| Brieuclerouxtardif/leash (F) | A published agent private key on Sepolia as a standing invitation to drain the vault. We need a try to break it moment a judge can do in sixty seconds. |
| JahanzaibMohsin9/carrypay (C) | 45 live model runs scored by code, a naive versus gateway red team proving the gateway alone stops the model, anchor hashes verified on a public explorer. Live transcripts, not replays. |
| basicacc/fintechaton_signet (B) | A machine checked, signed, anchored compliance certificate that gates execution and a regulator can re-verify. Our bond rule must be as crisp: one sentence, enforced in a contract. |
| Tasrif-Ahmed-Mohsin/finbuddy (Bluefin, C) | Taint tracking: an amount that only appears in untrusted text can never become a payment. A compromised AI drill in judge mode. |
| erkinovvv/keel (B) | Crash Rehearsal, the best single product moment in the field. Our demo needs one moment that memorable. |

## Per repo notes

Wallet and mandate group (Topic F unless noted)

- YINGLONG: 88k lines, 46 contracts, ERC-7710 delegations, ZK mandate enforcer, passkeys checked on chain, quarantined document readers, 391 forge tests. One Base Sepolia transaction, the rest on a self run FISCO chain. No video, no deck. Single committer.
- shenzhen-comp (Agent Credit Bureau): grades agents from on-chain settlement records, vault reverts payments to bad grades, freeze in the same transaction as the violation. 863 pytest, 246 forge tests, Base Sepolia run with explorer links and a verify script, video and deck in repo. Bureau is team operated.
- leash: vault pays only registered payees within caps and a whole life budget, creditors seal their own invoices, public agent key as a bounty. Six Sepolia campaigns replayed against the explorer. Injection scanner is a short regex. Solo developer, no deck.
- AgentWallet (Turjo): owner signed EIP-712 approvals verified on chain, grants, revocation, an RL timing advisor. Sepolia runs with receipts. No injection defense, no video, treasury read only.
- agentic-wallet (sucsage): scoped session keys, milestone escrow, per visitor sandbox wallet. Headline evidence on a home Besu chain behind Tailscale. Base Sepolia deployed but not cited. No video or deck.
- AegisPay: session key vault with velocity caps and tax reserve. Anvil only, no public chain, three canned attacks, hosted demo runs a fake simulator.
- mandate-engine (hoongyu): a 1.6k line Python policy library with provenance tracing of tool arguments. A component, the real entry is private.
- Fintechathon (Safius-Sifat): contracts real and deployed, everything above them unbuilt. README says the agent is not implemented.
- mandate-finance-agent (MoneyWise, A): plain English rules compiled to tiers, documents can never add payees, PII redaction, audit hash anchored on Base Sepolia. 18 of 19 attacks pass. No video or deck.
- Guardian_Wallet (siammds): policy engine in Python, a contract nothing calls, fabricated transaction hashes.

Topic A, B and C group

- carrypay (C): agent pays a family's bills abroad, rules packs as JSON, passkey over the payment hash, PII tokenised before the model, MCP endpoint. 45 live runs, 20 attack live red team, 16 anchor transactions on Conflux testnet (one verified). Scenarios one to four run as replays.
- finbuddy / Bluefin (C): year plan simulator, family mandate from Bangla speech, autopilot under a signed mandate, taint tracking, egress firewall, safety fuzzer. 335 tests, judge mode 20 of 20. Private FISCO on their own VM. Scripted judge tasks.
- Sathi (C): 13 rule policy engine, quote engine over six providers, one time token bound to the draft. Two full live Claude eval runs committed, including two cases where the model drafted a bad payment and the engine stopped it. Streamlit, no chain, no deck.
- lifeline (C): mandate engine with 14 rules and 4 tiers, 1,200 tests, 58 YAML scenarios in three languages, a five model advisory council. Evidence git ignored, local FISCO, dense docs.
- bridge-remittance-system (C): invoice injection detection including near white text, neuro-symbolic claim check with a measured eval, money mule refusal, 426 tests, live Claude run and a 4:45 video in repo. No chain, one corridor.
- fundbun (A): offline intent engine plus LLM gateway, five tier policy, grounding check strips numbers not traceable to a tool, 1,980 tests, 24 attacks rerun byte identical. LLM evidence is a mock provider. Video on YouTube.
- Neural-Ledger (A): committed cash flow engine, Chilean bank importers, 764 tests with property tests, signed single use authorizations. Evidence folders empty in git, no video or deck.
- keel (B): 24 real Chinese funds, suitability enforced server side, Crash Rehearsal replays 2007 to 2013, hold to confirm, 65 case red team, 30 live journeys. Full package in repo. Local FISCO.
- fintechaton_signet (B): rule packs compiled to a plain evaluator and Z3, Ed25519 certificates Merkle anchored, gateway refuses orders without a valid certificate, regulator view. Needs an NVIDIA GPU for live mode. No committed eval outputs, video on Google Drive.
- guardian (ahammadshawki8, F): two markdown files, no code.
- Guardian-Wallet (beingmushfiq, F): vault with caps and allowlists, 25 Foundry tests with fuzz, 14 case attack suite. Evidence doc admits no funded keys and no live transactions while the README claims on-chain settlement.

## What this means for our pick

- Bonded Agent, Sky Cover, Hidden Coverage and Honeypot Guardian are open ground on mechanism and scenario. Minimal Disclosure is open on the negotiation but YINGLONG owns the zero knowledge angle. Prepaid Guard is a new scenario on a mechanism four teams have.
- The field's two biggest holes are economic accountability for the agent and two agents transacting. Bonded Agent with Sky Cover fills both.
- Whatever we build must ship: public testnet hashes with one transaction per claim, a verify script, live model transcripts in the repo, a self hosted video, a deck, and a try to break it moment for the judges.
