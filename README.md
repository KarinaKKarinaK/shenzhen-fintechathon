# Shenzhen FinTechathon 2026, International Track

Working repo for our entry to the 8th Shenzhen International FinTech Competition (FinTechathon), International Track. Theme: "AI as a Financial Participant".

Deadline: 20 October 2026, 23:59 Beijing time. Registration and submission close at the same time.

## The app

Live: https://surety-fintechathon.vercel.app

- Landing page: who it is for (agricultural pilots, fleets, households with a humanoid, small factories, software agents), how one task flows, the competition's requirements mapped to where they live, the scoring criteria, and what no other entry has.
- Mission control (`/app`): a left rail with Overview, Neighbourhood, Fleet, Attack lab and Evidence.
- Neighbourhood and Fleet: press Start to watch the agents act. A 3D scene shows the machine, the geofence, the lender and the bond contract, with money dots flying on every transaction. Panels show the agents talking, each signed intent through the policy engine line by line, the chain feed with hashes, the bond gauge, the lease bar and the balance sheet.
- Attack lab: the hunter runs twenty attacks against a shadow agent, then a judge types their own and sees the gate verdict, the framed message and the shadow policy decision.
- Evidence: the attack set runs at request time, with chain mode and model mode shown honestly.

### Run it locally

```
cd web
pnpm install
pnpm dev
```

Optional environment (see `web/.env.example`): an AI gateway or Anthropic key lets the model write the agents' explanations (decisions stay in code), and a funded Base Sepolia key makes every transaction real with explorer links. Without them the engine runs scripted explanations on a simulated chain and labels every hash as simulated.

### Layout

- `web/src/engine`: the backend. Policy engine, SCP style message framing and judge gate, in-memory mirrors of the three contracts, the three agents, the twenty attack cases, the scenario runners, and the chain adapter. `selfcheck.ts` runs the attack set and a normal flow: `npx tsx src/engine/selfcheck.ts`.
- `web/src/app/api`: `run` streams a scenario as server sent events, `judge` is the judge console, `attacks` returns the attack results.
- `web/src/components`: the 3D scene, the panels, the run hook, the rail.
- `contracts`: `IBonded`, `Bond`, `JobBoard`, `Lease` in Solidity with Foundry tests for the bond. Written, not yet compiled on this machine (no Foundry installed). See `contracts/README.md`.

## Files

- `HACKATHON.md`: everything we know about the competition. Rules, topics, scoring, deliverables, timeline, prizes, contacts, judge profile, and open questions to confirm with the organizers.
- `IDEAS.md`: the full brainstorm. Thirty-five ideas, each with the pitch, the local hook, the demo moment, the security story, and the build risk.
- `FINAL_IDEAS.md`: the top four ideas for Topic F scored on the rubric, the layers to add, the recommendation, and the three competitors to beat with how to beat them.
- `BONDED_AGENT.md`: Surety, the final idea. One wallet standard for machines that earn, pay and post a bond, with two sides: commercial fleets and individuals lending a robot to a neighbour. Flows, the bond, the hunter, CoverAI and competitor comparison, scoring, risks, demo, app, SCP, autoresearch, market.
- `CORE_IDEA.md`: the ranked shortlist and the one we are building, with scope, architecture, and demo script.
- `SECURITY.md`: the security layer that goes into whichever idea we pick. Permission tiers, policy engine, injection defense, and the attack test cases we ship with the code.
- `PLAN.md`: hour by hour plan to the deadline and the submission checklist.
- `COMPETITION.md`: scan of all 113 public competitor repos for this track (18 Oct), each code reviewed and scored against the official rubric, with the overlaps for every one of our ideas.
- `FIELD_REVIEW.md`: every competitor repo read file by file and checked against our top ideas. Which ideas nobody has, the bars to match, the weaknesses to exploit.
- `JUDGE_REVIEW.md`: blind review of all twelve ideas by three simulated judges (WeBank industry, academic, security and compliance), with expected and potential scores.

## Status

- [ ] Team locked (2 to 5 people, at least 60 percent non-Chinese nationals)
- [ ] Passport bio pages collected
- [ ] Eligibility confirmed by email with the organizers
- [ ] Idea chosen
- [ ] Repo, testnet wallet, faucet funds
- [ ] Happy path with a real transaction hash
- [ ] Attack tests passing
- [ ] Demo video recorded
- [ ] Tech doc, security self-assessment, deck
- [ ] Submitted
