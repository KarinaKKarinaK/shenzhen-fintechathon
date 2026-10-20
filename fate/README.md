# FATE federated pilot credit

Three lenders train one pilot default model with WeBank's FATE without pooling their repayment records. The trained coefficients become the starting prior of Zishi's pilot credit score, so a new pilot with no history at this lender starts from the other lenders' experience instead of a flat fleet guess.

## Run

```
./fate/run.sh
```

Needs `uv` and `pnpm`. First run makes `fate/.venv` (Python 3.10, pinned in `requirements.txt`, FATE `pyfate==2.2.0`). Takes about a minute. Set `FATE_VENV` to reuse an existing venv.

It does three things:

1. `experiment.py` generates the data (seed 20261020), trains with FATE and writes `results.json` and `model.json`.
2. Copies `model.json` to `web/src/engine/credit/fate-model.json`.
3. `web/scripts/fate-prior.ts` measures what the prior changes for new pilots and adds `prior_effect` to `results.json`.

## How FATE runs

- FATE 2.2.0 from PyPI, standalone mode: `fate.arch.launchers.multiprocess_launcher` starts one process per party (guest 9999 = lender A, host 9998 = lender B, host 9997 = lender C, arbiter 10000) over FATE's standalone computing and federation backends. No cluster, no FATE-Flow.
- Horizontal (homo) framing: same six features, different pilots per lender.
- `HomoLRClient` / `HomoLRServer`: FedAvg with FATE's default secure aggregation, 40 epochs, batch 64, Adam lr 0.05, L2 0.001, zero init.
- Each lender's rows stay in its own process. Feature scaling is fixed from domain ranges, so no statistics are shared either.
- Baselines use the same FATE client in local mode: each lender alone, and a pooled run on all rows (an upper bound no real party could run).

## Data

Synthetic only. 9000 pilots from a fixed seed: 3000 held out for test, the lenders get non overlapping slices of the rest. Lender A (300 rows, rural credit coop) mostly new pilots, lender B (300, equipment lender) experienced pilots with steady income, lender C (150, regional bank) experienced pilots with seasonal income. 10 percent of pilots land outside their segment.

Features are what a lender can see at onboarding: years flying, thousand mu sprayed last season, share of flight logs held by the plausibility check, bond slashes, down payment share, share of fees earned in the two peak months.

## Results (held out, 3000 pilots)

| Model | AUC | F1 at 0.2 | Accuracy at 0.5 | Brier |
|---|---|---|---|---|
| Lender A alone | 0.729 | 0.334 | 0.823 | 0.129 |
| Lender B alone | 0.779 | 0.397 | 0.867 | 0.103 |
| Lender C alone | 0.787 | 0.416 | 0.878 | 0.097 |
| FATE federated | 0.782 | 0.399 | 0.872 | 0.100 |
| Pooled (upper bound) | 0.782 | 0.411 | 0.875 | 0.098 |
| True pd (ceiling) | 0.800 | 0.427 | 0.879 | 0.094 |

What this shows: federated matches pooled (AUC 0.7819 vs 0.7823) without moving rows, and lifts lender A, the lender with the new pilots, from 0.729 to 0.782. Lender C alone does as well as federated on this seed; its segment happens to cover the test population well. The federated model is identical on all three lenders after the last round.

## Effect on the credit score

`web/src/engine/credit/federated.ts` scores a pilot's default probability `pd` from the exported coefficients and starts the instalment component of the Beta prior at `1 - pd` (clamped to [0.5, 0.995]). The credibility weight is unchanged (the prior counts as 8 jobs), so the pilot's own record takes over as jobs come in. No model, or a malformed one, means the flat fleet prior as before. Money still moves only through `rateFor` inside the policy's rate band.

Measured on the 3000 held out pilots: error between the instalment share the engine recommends and the share it converges to for that pilot (rate band 2000 to 4500 bps). Jobs are simulated with seed 7, the same outcomes for both arms.

| | Flat prior | FATE prior |
|---|---|---|
| Mean error at onboarding (0 jobs) | 335 bps | 153 bps |
| Within 100 bps at onboarding | 24% | 55% |
| Mean error after 5 jobs | 368 bps | 302 bps |
| Mean error after 20 jobs | 299 bps | 279 bps |
| Risky pilots (pd at least 0.2, 596): mean underpricing at onboarding | 1038 bps | 255 bps |
| Safe pilots (pd under 0.1, 1728): mean overpricing at onboarding | 135 bps | 83 bps |

The gain is largest at onboarding, which is the point: that is where a lender has nothing else. After a few jobs both arms are dominated by the noise of a handful of outcomes, and the gap closes.

## Model provenance

`model.json` carries the coefficients, intercept, feature scaling, FATE version, party row counts and five held out rows with FATE's own predictions. Its `sha256` is over the canonical JSON of every field except `sha256` and `sha256_of` (sorted keys, no spaces, numbers as JavaScript writes them), so it can be recomputed in Python or TypeScript and anchored on chain. `pnpm test` in `web/` recomputes the hash and checks the TypeScript scorer reproduces FATE's predictions within 1e-6.

## Scope

- Synthetic data, offline experiment. No real pilots or loans.
- The live app does not call FATE. It reads the exported coefficients.
- One seed. Differences of a few thousandths of AUC between arms are within noise.
- The prior study assumes a pilot misses an instalment on a job with probability equal to their loan level default probability.
