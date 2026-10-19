# Final ideas: top four for Topic F and the three competitors to beat

19 October 2026. Built from IDEAS.md (34 ideas), JUDGE_REVIEW.md (two simulated juries), COMPETITION.md (113 public entries scored) and FIELD_REVIEW.md (every linked repo read file by file plus a fresh search).

Scoring reminder: task completion 40, security and compliance 30, innovation and interaction 30, on-chain challenge bonus 0 to 5. Topic F is the only topic with the bonus. At least eight Topic F entries already have mined transactions with explorer links, so the bonus is contested, not free.

## What the whole field is missing

Every one of the roughly 150 public entries is a single assistant that proposes, with code that decides and a human that confirms. Nobody has:

1. An agent with consequences: no bond, stake, slashing or liability anywhere.
2. Two agents transacting with their own incentives.
3. A machine as the customer or the borrower.
4. An active response to fraud. Every scam handler refuses and logs.
5. A physical device holding the key.

Each of the four ideas below takes at least two of these. That is the originality test we applied.

## The top four

### 1. Bonded Agent, with a drone as its first customer

What it is. The agent posts a bond on chain before it may act. Every policy breach, disputed transaction or failed attack test slashes the bond. An agent with no bond cannot transact. Its first customer is a delivery drone that buys per flight cover from an insurer agent: premium priced live on route, weather and payload, paid per flight, crash settled from signed flight telemetry. Two agents with opposite incentives, one machine paying, one oracle settling.

Why Shenzhen. The low altitude economy is the city's flagship industrial policy. Commercial drone delivery runs in the city. Ping An, headquartered in Shenzhen, and PICC already sell drone cover, annually and manually.

What nobody else has. The bond (field hole 1), the insurer agent as counterparty (hole 2), the machine customer (hole 3). The Agent Credit Bureau demotes an agent's tier on a violation but never puts its money at risk. Lantern gates permissions on a soulbound score. signal8-wallet has a mock parametric insurer triggered by a typhoon warning, which is why our oracle is flight telemetry, not weather.

Rubric. Task 25, security 22, innovation 26, bonus 3. Expected 76. Potential high 80s if the demo lands.

Demo in five minutes. Drone plans a route, insurer agent quotes, drone agent pays, hash. Weather cell crosses the route, requote, hash. Drone crashes, telemetry settles the claim, hash. Drone agent is tricked into overpaying, the policy engine blocks it, the bond takes a slash, hash. The insurer agent refuses the next quote until the bond is topped up.

Scope for the time left. One bond contract (deposit, slash, top up, minimum to transact). One cover contract (quote, bind, settle on signed telemetry). Two agents with structured outputs. A pricing function. A telemetry signer. The policy engine from SECURITY.md. Twenty attack tests. A map with three drones. Deck and video.

Risk. Scope. Cut to one drone and a fixed route if needed. Never cut the bond slash or the telemetry settlement.

### 2. The robot that pays for itself

What it is. A small factory gets a robot arm on hire purchase. A licensed lessor owns it until the agreed total is paid. The robot's agent counts verified parts from the machine data, checks them for physical plausibility (cycle time, energy per part, shift pattern), computes the amount due at a rate per part inside an agreed band, and pays the lessor from a ring fenced sub account. Tampered data freezes repayment. Ownership passes when the total is reached.

Why Shenzhen. Thousands of small suppliers in Shenzhen, Dongguan and Bao'an cannot get credit for automation because they have nothing to pledge except the machine. Data driven credit for firms traditional banks turn away is what WeBank means by inclusive finance. Four of eight simulated mentors would champion it.

What nobody else has. The machine as the borrower (hole 3) and a lessor agent on the other side (hole 2). Add the bond from idea 1 and it takes hole 1 too. Supply chain finance entries exist in Topic E but all are cash flow copilots for a human.

Rubric. Task 27, security 23, innovation 25, bonus 3. Expected 78. The best inclusion story of the four and the strongest jury pull.

Demo in five minutes. A 15 person workshop, a 180,000 CNY arm. The lessor approves, the robot gets its wallet and rules. The simulated arm produces, each verified batch of 500 parts triggers a payment, hash. A physical counter on stage if the team wants it. Then a faked counter: the plausibility check catches it, repayment freezes, the lessor is alerted. The LLM reads a maintenance invoice and explains the incident to the owner.

Scope for the time left. One hire purchase contract (balance, rate band, minimum, ownership transfer). A machine simulator with a tamper mode. A plausibility check with a measured detection and false alarm rate on synthetic data. The agent loop for invoices and explanations. Policy engine, attack tests, deck, video.

Risk. The model's role can end up thin, so design the invoice reading and the owner explanation in from the start. One economics slide is mandatory or it reads as a gimmick.

### 3. Honeypot Guardian on chain

What it is. A wallet for elderly people and migrant workers as a smart account with a trusted contact as guardian co-signer above a cap. When the agent detects a scam call or message, it does not just refuse. It takes over the conversation as the victim, keeps the scammer talking, extracts the mule account and the script, and writes both to a shared blocklist contract that every wallet checks before a transfer. The user's funds never move during the session.

Why Shenzhen. Telecom fraud is a national priority and Shenzhen runs one of the most active anti fraud centres. Most residents send money to family elsewhere. O2 in the UK launched an AI grandmother that wastes scammers in 2024. Nobody wired it to the payment rail.

What nobody else has. The active response (hole 4) and a shared on-chain registry other agents consume (hole 2 in a weak form). Three repos are named Guardian Wallet and several strong entries have scam shields. All of them stop at refuse and log.

Rubric. Task 27, security 23, innovation 26, bonus 2. Expected 78 on paper. Jury fit is the risk: a licensed bank's panel may find deception and recording edgy. Consent and a "never with real funds" rule must be on slide two.

Demo in five minutes. A scam call in Mandarin. The agent plays along. The mule account appears on screen and lands in the blocklist, hash. A second wallet in the room tries to pay that account and is refused. Then the user tries to override and the guardian co-signer flow holds it.

Scope for the time left. One smart account with a guardian threshold. One blocklist registry contract. The scam pattern library from published police typologies. Two model role play. Policy engine, attack tests, deck, video.

Risk. Lowest build risk of the four. Rename it, since the name is taken three times.

### 4. Prepaid Guard

What it is. Gyms, tutoring centres and salons take prepaid money and disappear. The agent negotiates the membership, locks the money in escrow, releases one session's worth per verified visit, watches the business registry, and refunds the rest the minute the merchant deregisters. Shenzhen already pilots e-CNY smart contracts that do exactly this for prepaid funds.

Why Shenzhen. It mirrors a live Shenzhen government pilot. Judges will know the problem from their own lives.

What nobody else has. Consumer prepaid escrow with per visit release and a registry trigger. Milestone escrow exists in four Topic F entries, all business to business.

Rubric. Task 30, security 24, innovation 17, bonus 3. Expected 74. The safest of the four and the one most likely to finish, and the one most likely to be told "escrow again".

Demo in five minutes. Sign up, lock 3,000 CNY, three check ins release three payments, hashes. The merchant sends "release everything early", blocked. The merchant deregisters, the balance comes back, hash.

Scope for the time left. One escrow contract with per visit release and a refund path. A check in signer. A mock registry feed. Agent for negotiation and messages. Policy engine, attack tests, deck, video.

Risk. Innovation score. Add Hard Button or Sparring to lift it.

## Layers that go on whichever we pick

- Hard Button (idea 21): a small board holds the only key for the top tier. Nobody in the field has a physical device. One evening for a hardware team.
- Sparring (idea 30): a shadow red team attacks every action before it runs. Every other entry's injection defense is a regex.
- Evidence discipline: one public testnet hash per claim, a verify script, live model transcripts in the repo, a self hosted video, a deck. This is where most of the field fails.

## Recommendation

Build idea 2 with the bond from idea 1: the robot that pays for itself, posting a bond that is slashed when its agent breaks policy, with the lessor as a second agent. It has the strongest inclusion story for a WeBank panel, the strongest jury pull, a physical object on stage, and it takes three of the five field holes. Idea 1 is the alternative if the team prefers drones and an insurer agent. Idea 3 is the fallback if the machine simulation is not stable by Monday evening.

## The three competitors to beat in Topic F

### 1. taivnaaiwnl/shenzhen-comp, Agent Credit Bureau (score 94 in our scan)

What they built. A credit bureau that grades agents from on-chain settlement records. A vault that reverts a payment if the payee's grade is below the mask. The wallet's own tier is promoted or demoted on chain from its own record, with a freeze in the same transaction as the violation. ERC-8004 registry. 863 pytest and 246 forge tests, including sybil and wash trading attacks on the scorecard.

Evidence. The best package in the field. A public Base Sepolia run with one transaction per claim and explorer links, verified source, an offline verify script, recorded model dialogue, a five minute video and a seventeen slide deck in the repo.

Weaknesses. The bureau is operated by the team, so grades are only as independent as their key. Two team members. The attack suites run on a local chain. Some dialogue steps are scripted. Reputation without money at risk: an agent loses privileges, never funds.

How we beat them. Match the one hash per claim discipline and the verify script. Then go one step further than reputation: the bond makes the consequence economic, and the second agent (lessor or insurer) makes it a market, not a bureau.

### 2. ABRUBAB/YINGLONG (score 97 in our scan)

What they built. Plain language rules compiled into ERC-7710 delegations whose caveat enforcers are the rules. 46 contracts, a zero knowledge mandate enforcer, passkeys verified on chain, quarantined document readers with a closed schema so the model structurally cannot emit an address, tiers that can only go up, kill switch, veto timelock. 391 forge tests with invariants. Same bytecode on Base Sepolia and a team run FISCO BCOS chain. 88,000 lines.

Evidence. One Base Sepolia transaction. About fifteen on their private FISCO chain. Live model receipts. A 300 attack benchmark claimed. No video, no deck.

Weaknesses. Nearly all on-chain evidence is on a chain they control. Scope so large a judge may doubt a student team built it. Single committer. No video. The clarity of the story suffers under the volume.

How we beat them. Clarity and public evidence. One mechanism a judge can repeat in a sentence, every claim on a public explorer, a finished video. Their structural injection defense (the model cannot name an address) is worth copying.

### 3. Brieuclerouxtardif/leash (score 91 in our scan)

What they built. A vault whose agent key can only pay registered payees within caps and a whole life budget. Creditors seal their own invoices with a contest window. Owner co-signs anything else. The agent's private key is published on Sepolia as a standing invitation to drain the vault, and a script computes the worst case loss from chain state alone.

Evidence. Six Sepolia campaigns with every transaction replayed against the explorer, eight public key attack transactions with links. Video script and screenshots. No deck found.

Weaknesses. Solo developer. Injection scanner is a short regex. The pool is a toy. No rendered video found.

How we beat them. Steal the move: give the judges a sixty second way to try to break us. Then show what they cannot: a second agent with its own incentives and a consequence for the agent itself.

### Outside Topic F, the two strongest entries overall

- JahanzaibMohsin9/carrypay (C): 45 live model runs scored by code, a naive versus gateway red team, anchor hashes verified on a public explorer, video and PDFs. The evidence bar for the whole competition.
- beaaan/signal8-wallet (F, found in the second search): a Safe with a storm plan that switches on when Hong Kong Signal 8 is attested on chain, mock typhoon cover, 111 tests, deck, video, live demo. The closest anyone comes to a parametric participant. Treat it as a fourth Topic F competitor.

## What we must ship no matter which idea

1. Public testnet transactions, one per claim, with explorer links and a verify script.
2. Live model transcripts committed to the repo, not replays or mocks.
3. The twenty attack tests with results, including any that fail.
4. A self hosted video under five minutes. YouTube and Google Drive are blocked where the judges sit.
5. A deck under ten minutes, the technical document and the security self-assessment with permission tiers and known risks.
6. A README that claims only what the code does. Two entries were caught claiming on-chain settlement their evidence files contradict, and one hardcodes borrowed hashes.
7. One moment a judge can try to break in sixty seconds.
