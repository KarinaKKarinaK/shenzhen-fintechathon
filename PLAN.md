# Plan to the deadline

Deadline: Tuesday 20 October 2026, 23:59 Beijing time (17:59 Amsterdam). Submit by 21:00 Beijing and overwrite if allowed.

## Saturday night (18 Oct)

- Lock the team. Collect passport bio pages. Fill the registration form.
- Email both organizer addresses (see HACKATHON.md) about exchange student eligibility and the submission address. Register tonight even if the answer is pending.
- Pick the idea (see CORE_IDEA.md).
- Create the testnet wallet, get faucet funds, deploy a hello world contract so the toolchain is proven.

## Sunday (19 Oct)

Morning
- Escrow contract written and deployed to the testnet. Unit tests pass.
- Policy engine with caps, allowlist, rate limit, deviation check. Tests pass.

Afternoon
- Buyer agent and supplier agent loop. Structured action output. Negotiation over price, quantity, delivery.
- Wire agent to policy engine to smart account. First real transaction hash.

Evening
- Full happy path end to end: negotiate, lock escrow, submit evidence, release milestone. Save every hash.
- Optional: deploy the same contract to a local FISCO BCOS node.

## Monday (20 Oct)

Morning
- Injection defenses. Run the 20 attack tests. Fix failures.
- Record the demo video (5 minutes max). Happy path, then one attack blocked live.

Afternoon
- Technical documentation (architecture, core algorithm, security design).
- Security self-assessment.
- Deck, 10 minutes max.
- README with deployment steps and how to run the tests.

Evening
- Submit by 21:00 Beijing. Confirm receipt.

## Submission checklist

- [ ] Registration form and passport copies sent
- [ ] Technical documentation
- [ ] Deck (10 minutes or less)
- [ ] Video (5 minutes or less)
- [ ] Source code, README, deployment instructions, test cases, public GitHub link
- [ ] Security self-assessment with permission tiers and known risks
- [ ] Execution evidence: transaction hashes with explorer links, logs
- [ ] Every claim on a slide has a source
- [ ] No secrets in the repo (keys, RPC URLs with tokens)
- [ ] Team names, universities, and nationalities listed as the form requires

## Cut list, in order

If time runs out, cut from the top.

1. FISCO BCOS second deployment
2. Vision check on milestone evidence (replace with a hash of an uploaded file)
3. Logistics tracking milestone (keep one milestone)
4. Chinese language supplier agent (keep English)
5. Front end polish (a terminal log that streams is enough if it is readable)

Never cut: the real transaction hash, the policy engine, the attack tests, the video.
