# Field review: our ideas against the competitor repos

19 October 2026. Every repo linked in COMPETITION.md was cloned and read file by file (nothing was run). All three groups are done: the ten wallet and mandate repos, the eleven Topic A, B and C repos, and the eight Topic D and E repos, plus a fresh GitHub search that found about forty more public entries.

## Short answer

Four of our seven candidates are built by nobody. Two are partially covered by entries the first scan missed. Across 29 repos plus the search:

| Our idea | Anyone doing it | Closest thing found |
|---|---|---|
| Bonded Agent (agent posts a bond, slashed on breach, buys liability cover) | Nobody | Agent Credit Bureau demotes an agent's tier and freezes it on chain, but no money at risk. Signet refuses execution without a valid certificate, but no stake. |
| Sky Cover (machine buys per-flight cover from an insurer agent, telemetry settles) | Partial, one repo | beaaan/signal8-wallet has a mock parametric insurer on Base Sepolia that pays a fixed sum per storm when HKO Signal 8 is attested on chain. No premium pricing, no telemetry, no machine customer, insurer is a mock. |
| Hidden Coverage (coverage map, add-on blocker, claim split, no double recovery) | Partial, two repos | FarrelNayakaaa/covercompass flags duplicate premiums across policies and splits one claim across policies so the total never exceeds the bill, in code. ClaimWise decides primary and secondary payer but hardcoded to demo clause ids. Nobody reads card terms or blocks pre-ticked add-ons at checkout. |
| Minimal Disclosure (agents negotiate the minimum data for a credit decision) | Partial, one repo | YINGLONG proves mandate compliance with a zero knowledge enforcer. carrypay tokenises PII before the model. Bluefin issues a signed payment passport. Nobody negotiates. |
| Honeypot Guardian (engage the scammer, extract the mule account, shared blocklist) | Nobody | Every scam handler refuses and logs. Three repos are called Guardian Wallet. |
| Prepaid Guard (escrow released per visit, refund on deregistration) | Partial, four repos | Milestone escrow with refund paths in agentic-wallet, AegisPay, Agent Credit Bureau, YINGLONG. None per visit or consumer prepaid. |
| Hard Button (dedicated device holds the only key, top tier is a physical press) | Partial, one repo | YINGLONG verifies phone passkeys on chain. No ESP32, hardware wallet or secure element in any repo or search result. |
| Signal 8 (idea 14, parametric rider cover on typhoon warnings) | Done, one repo | beaaan/signal8-wallet: SME treasury on a Safe with a storm plan that switches on when HKO Signal 8 is attested, claims mock typhoon cover, 111 tests, deck, video. Drop idea 14. |

## Our repo is public

This repository appears in a GitHub search for "fintechathon". Competitors can read every idea file. Make it private until submission, or accept that the ideas are visible.

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

## Topic D and E group

- runway (E): 13 week forecast, rules engine with tiers T0 to T4, Ed25519 signed two person approvals embedded as a QR in the financing PDF, hash chained audit anchored to a notary file or any EVM chain. 466 tests, live DeepSeek traces. Anchors on local Anvil only, no video, Streamlit, single developer.
- DuitDuit (tanhongsheng, E): 96k lines, PII tokenised before any model call, maker checker payments, lender passports with HMAC signed banded metrics. Agent registry screens are stubs. Audit anchoring is a GitHub Actions job, not a chain. Vercel blocked in the mainland.
- KhataPilot (E): guard pipeline, tiers where any block wins, provider refuses anything not signed by the guard key, scheduled payments rechecked at time of use, a deliberately gullible mock model so every offline run is a worst case. Live Claude red team 54 of 54 with cost reported, video and deck in repo, an architecture test proving the agent layer cannot import the database or the key. No chain.
- cashbridge (E): forecast, three way match, funding pack with a verifiable hash chain, every claim tagged verified, calculated, estimate or assumption. LLM planning intentionally disabled. Demo OTP secret is public. No video, no deck, no chain.
- tidewise-copilot (E): tiers with provenance taint, lookalike domain check, Merkle log with inclusion proofs. 41 tests, one commit, security self-assessment marked TODO.
- Setu (E): milestone escrow state machine (simulated), KYB, forged bill of lading forensics, a hash registry so one document cannot back two lenders. Model capped at read only tools. 598 tests. No chain, no deck, no video yet.
- ClaimWise (D): policy PDF upload, hybrid retrieval with citation checks, coverage comparison written by the model, primary and secondary payer hardcoded to demo clause ids, single policy payable calculation, sandbox submission. The "AI tier" in code is a subscription tier. 357 tests, no public video.
- claimshield-ai (D): tiers with HMAC sessions and single use OTP, regex prompt firewall, bill auditor, appeal drafts. The API hands out the OTP for demo convenience. 11 tests, single commit, US centric.

Found by the search and not in the first scan (the ones that matter):

- beaaan/signal8-wallet (F): the Signal 8 storm plan entry above. Public Base Sepolia, 111 Foundry tests, deck, video, live demo.
- FarrelNayakaaa/covercompass (D): multi policy student assistant with the overlap and payout split tools above.
- Exile404/Qwen-Hufu (F): student wallet with an off-chain guard and an on-chain vault on Sepolia, 70 forge tests.
- Trong-Tra/Lantern (F): ERC-8004 passport plus soulbound reputation on Monad testnet, score gated permissions. Closest thing to agent reputation after the Agent Credit Bureau.
- Brandon962Leong/null-wallet (F): value moves only after an "Evidence Court", signer isolated from the language layer, receipts anchored on Base and Sepolia.
- himoji/kassa (C): passkey signed mandates, Ed25519 signed credit records a landlord or bank can verify, Sepolia anchors, deck and video.
- AsylkhanKali/fintechathon (F): treasury agent with a founder signed policy enforced by a contract on Base Sepolia.
- hung230206/AI4S and pinkerparker/WeBank_TuiDui (D): China regulation insurance Q&A and plan matching. Document assistants.
- About twenty more Topic A, B, C and E entries with the same shape as the groups above, plus two empty templates.

Topic F is larger than the first scan counted and at least eight entries have mined transactions with explorer links. The on-chain bonus is contested.

Additional bars from this group:

| Repo | What they do that we must match or beat |
|---|---|
| FarhanKO/KhataPilot (E) | Live model red team with cost and commit hash reported, a scripted demo checked step by step, and an architecture test proving the model layer cannot reach the database or the signing key. |
| gabi200/runway (E) | Human approvals as Ed25519 signatures a third party can verify from the PDF, and a forged history demo against an anchored audit head. |
| Ebratul/Setu (E) | Depth on one mechanism: model capped at read only tools, escrow and deal state machines with 800 tests, a registry so one document cannot back two loans. |
| beaaan/signal8-wallet (F) | A real external trigger (HKO Signal 8) attested on a public chain and a plan that switches on from it. The closest anyone comes to a parametric participant. |

## What this means for our pick

- Bonded Agent, Honeypot Guardian, Prepaid Guard (as a scenario) and Hard Button are built by nobody. Minimal Disclosure is open on the negotiation, though YINGLONG owns the zero knowledge angle and three entries issue one way signed attestations.
- Hidden Coverage is less open than the first scan suggested. covercompass already splits a claim across policies with a no double recovery rule in code. Our version still has the card terms, the checkout guard and three jurisdictions, but the core mechanism is no longer unique.
- Sky Cover is open on the machine customer, live pricing and telemetry settlement. signal8-wallet owns the typhoon trigger and the mock parametric insurer. Drop Signal 8 (idea 14).
- Insurance entries in the field are all document assistants. Nobody has an insurer that is itself an agent with its own incentives. An insurer agent that prices and pays is open ground in Topic D.
- The field's two biggest holes are economic accountability for the agent and two agents transacting. Bonded Agent with Sky Cover fills both.
- Whatever we build must ship: public testnet hashes with one transaction per claim, a verify script, live model transcripts in the repo, a self hosted video, a deck, and a try to break it moment for the judges.
