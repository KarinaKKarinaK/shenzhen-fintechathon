"""Federated pilot default model with WeBank FATE 2.x (homo logistic regression).

Three lenders hold repayment records on different pilots (same features, different rows).
They train one default model with FATE's FedAvg and secure aggregation, run as separate
processes by FATE's standalone multiprocess launcher; raw rows never leave a lender's
process. The same FATE HomoLR client in local mode gives the lender-alone and pooled
baselines, so the only difference between the arms is federation.

Run:  ./fate/run.sh   (writes fate/results.json and fate/model.json)
"""
import hashlib
import json
import os
import shutil
import sys
import tempfile
from importlib.metadata import version

import numpy as np
import pandas as pd

SEED = 20261020
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")  # per party outputs of one run, gitignored

# Onboarding features a lender can read for any pilot, new or not: platform flight logs and
# the loan application. Scaling is fixed up front from domain ranges (not fitted on any
# lender's rows), so parties need not share statistics: x' = (f(x) - center) / scale.
FEATURES = [
    # name, transform, center, scale, meaning
    ("tenure_years", "identity", 3.0, 2.0, "years flying as a licensed spray pilot"),
    ("mu_last_season", "log1p", 1.8, 0.8, "thousand mu sprayed last season, from platform logs"),
    ("held_log_rate", "identity", 0.08, 0.06, "share of the pilot's flight logs held by the plausibility check"),
    ("slash_count", "log1p", 0.3, 0.5, "bond slashes on record"),
    ("down_payment_share", "identity", 0.25, 0.08, "down payment as a share of the drone price"),
    ("peak_income_share", "identity", 0.6, 0.15, "share of yearly fees earned in the two peak months"),
]
NAMES = [f[0] for f in FEATURES]
LENDERS = [("guest", "9999", "lender_a"), ("host", "9998", "lender_b"), ("host", "9997", "lender_c")]
ARBITER = ("arbiter", "10000")
EPOCHS, BATCH, LR = 40, 64, 0.05


def scale(df):
    out = pd.DataFrame(index=df.index)
    for name, tf, c, s, _ in FEATURES:
        v = np.log1p(df[name]) if tf == "log1p" else df[name]
        out[name] = (v - c) / s
    return out


def true_logit(df):
    # The ground truth the lenders do not know. Mostly linear in the scaled features, plus a
    # thin file effect: a new pilot with high seasonality is riskier than the sum suggests.
    z = scale(df)
    return (-2.3 - 0.55 * z.tenure_years - 0.45 * z.mu_last_season + 0.7 * z.held_log_rate
            + 0.5 * z.slash_count - 0.35 * z.down_payment_share + 0.45 * z.peak_income_share
            + 0.4 * np.maximum(0, -z.tenure_years) * np.maximum(0, z.peak_income_share))


def population(rng, n):
    tenure = rng.gamma(2.0, 1.5, n).clip(0, 12)
    mu = np.exp(rng.normal(1.7 + 0.12 * tenure, 0.6, n)) - 1
    held = rng.beta(2, 22, n) + 0.02 * (tenure < 1)
    slash = rng.poisson(0.15 + 0.05 * tenure, n)
    dp = rng.uniform(0.1, 0.4, n)
    peak = rng.beta(6, 4, n)
    df = pd.DataFrame({"tenure_years": tenure, "mu_last_season": mu.clip(0.1), "held_log_rate": held.clip(0, 0.5),
                       "slash_count": slash.astype(float), "down_payment_share": dp, "peak_income_share": peak})
    df["pd_true"] = 1 / (1 + np.exp(-true_logit(df)))
    df["y"] = (rng.uniform(size=n) < df.pd_true).astype(int)
    return df


def make_data():
    rng = np.random.default_rng(SEED)
    pool = population(rng, 9000)
    test = pool.iloc[:3000].copy()
    rest = pool.iloc[3000:].copy()
    # Non IID: each lender sees a different slice of the pilot market.
    # A: rural credit coop, mostly new pilots. B: equipment lender, experienced high volume
    # pilots. C: regional bank in a single crop belt, highly seasonal incomes.
    # Each pilot lands in one lender's book by segment, with 10 percent landing elsewhere.
    t, p = rest.tenure_years.values, rest.peak_income_share.values
    pick = np.where(t < 2, 0, np.where(p < 0.6, 1, 2))
    stray = rng.uniform(size=len(rest)) < 0.1
    pick = np.where(stray, rng.integers(0, 3, len(rest)), pick)
    sizes = {0: 300, 1: 300, 2: 150}
    parts = {}
    for k, (_, _, name) in enumerate(LENDERS):
        rows = rest[pick == k]
        parts[name] = rows.iloc[: sizes[k]].copy()
    return parts, test


def to_party_csv(df, path):
    out = scale(df)
    out.insert(0, "y", df.y.values)
    out.insert(0, "id", [f"s{i}" for i in range(len(df))])
    out.insert(0, "sid", [f"s{i}" for i in range(len(df))])
    out.to_csv(path, index=False)


# ---- FATE side: one function, run by every party process --------------------------------

def run_party(ctx):
    import torch
    from fate.arch.dataframe import PandasReader
    from fate.ml.glm.homo.lr.client import HomoLRClient
    from fate.ml.glm.homo.lr.server import HomoLRServer

    torch.manual_seed(SEED)
    data_dir = os.environ["ZISHI_FATE_DATA"]
    if ctx.is_on_arbiter:
        HomoLRServer().fit(ctx.sub_ctx("federated"))
        return
    me = ctx.local.party_id
    name = {pid: n for _, pid, n in LENDERS}[me]
    reader = PandasReader(sample_id_name="sid", match_id_name="id", label_name="y", dtype="float32")
    load = lambda f: reader.to_frame(ctx, pd.read_csv(os.path.join(data_dir, f)))
    train, test = load(f"{name}.csv"), load("test.csv")

    def client():
        return HomoLRClient(epochs=EPOCHS, batch_size=BATCH,
                            optimizer_param={"method": "adam", "penalty": "l2", "alpha": 0.001,
                                             "optimizer_params": {"lr": LR}},
                            init_param={"method": "zeros", "fit_intercept": True})

    def preds(c, sub):
        df = c.predict(sub, test).as_pd_df()
        return df.sort_values("sid")["predict_score"].astype(float).tolist(), df.sort_values("sid")["sid"].tolist()

    out = {"party": name, "party_id": me, "rows": int(train.shape[0])}
    # Federated: FedAvg with FATE's secure aggregation through the arbiter.
    torch.manual_seed(SEED)
    fed = client()
    fed.fit(ctx.sub_ctx("federated"), train)
    out["federated_scores"], out["sids"] = preds(fed, ctx.sub_ctx("fed_predict"))
    out["federated_model"] = fed.get_model()["param"]["model"]
    # Local only: the same client in FATE's local mode, this lender's rows alone.
    torch.manual_seed(SEED)
    loc = client()
    loc.local_mode = True
    loc.fit(ctx.sub_ctx("local"), train)
    out["local_scores"], _ = preds(loc, ctx.sub_ctx("local_predict"))
    # Pooled upper bound: only the guest runs it, on all lenders' rows, which in real life
    # no single party could hold. It exists to show how close federation gets.
    if ctx.is_on_guest:
        torch.manual_seed(SEED)
        pooled = client()
        pooled.local_mode = True
        pooled.fit(ctx.sub_ctx("pooled"), load("pooled.csv"))
        out["pooled_scores"], _ = preds(pooled, ctx.sub_ctx("pooled_predict"))
    with open(os.path.join(OUT, f"{name}.json"), "w") as f:
        json.dump(out, f)


def launch_fate(data_dir):
    from fate.arch.launchers.multiprocess_launcher import launch
    os.environ["ZISHI_FATE_DATA"] = data_dir
    parties = [f"{r}:{p}" for r, p, _ in LENDERS] + [f"{ARBITER[0]}:{ARBITER[1]}"]
    sys.argv = [sys.argv[0], "--parties", *parties, "--log_level", os.environ.get("FATE_LOG", "WARNING"), "--data_dir", os.path.join(data_dir, "fate")]
    try:
        launch(run_party)
    except SystemExit as e:
        if e.code:
            raise RuntimeError(f"FATE launcher exited with {e.code}")


# ---- metrics -----------------------------------------------------------------------------

def metrics(y, s):
    from sklearn.metrics import accuracy_score, brier_score_loss, f1_score, log_loss, roc_auc_score
    y, s = np.asarray(y), np.asarray(s)
    # Fixed cuts, not tuned on test: F1 at 0.2 (a typical default review cut), accuracy at 0.5.
    return {"auc": round(float(roc_auc_score(y, s)), 4), "f1_at_0.2": round(float(f1_score(y, s >= 0.2)), 4),
            "accuracy_at_0.5": round(float(accuracy_score(y, s >= 0.5)), 4),
            "brier": round(float(brier_score_loss(y, s)), 4), "log_loss": round(float(log_loss(y, np.clip(s, 1e-7, 1 - 1e-7))), 4)}


def js_num(x):
    # A number written the way JavaScript's JSON.stringify writes it.
    from decimal import Decimal
    if isinstance(x, int) or float(x).is_integer() and abs(x) < 1e21:
        return str(int(x))
    r = repr(float(x))
    if "e" in r and 1e-7 <= abs(x) < 1e21:
        r = format(Decimal(r), "f")
    return r.replace("e+", "e+").replace("e-0", "e-")


def canonical(o):
    """Sorted keys, no spaces, ASCII, JavaScript number format: what JSON.stringify gives on a key sorted copy."""
    if isinstance(o, dict):
        return "{" + ",".join(json.dumps(k) + ":" + canonical(o[k]) for k in sorted(o)) + "}"
    if isinstance(o, list):
        return "[" + ",".join(canonical(v) for v in o) + "]"
    if isinstance(o, bool) or o is None or isinstance(o, str):
        return json.dumps(o, ensure_ascii=True)
    return js_num(o)


def main():
    parts, test = make_data()
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    with tempfile.TemporaryDirectory() as data_dir:
        for name, df in parts.items():
            to_party_csv(df, os.path.join(data_dir, f"{name}.csv"))
        to_party_csv(test, os.path.join(data_dir, "test.csv"))
        to_party_csv(pd.concat(parts.values()), os.path.join(data_dir, "pooled.csv"))
        launch_fate(data_dir)

    res = {n: json.load(open(os.path.join(OUT, f"{n}.json"))) for _, _, n in LENDERS}
    order = [int(s[1:]) for s in res["lender_a"]["sids"]]  # FATE returns rows by sample id
    y = test.y.values[order]
    arms = {f"local_only_{n}": metrics(y, r["local_scores"]) for n, r in res.items()}
    arms["fate_federated"] = metrics(y, res["lender_a"]["federated_scores"])
    arms["pooled_centralized"] = metrics(y, res["lender_a"]["pooled_scores"])
    arms["oracle_true_pd"] = metrics(y, test.pd_true.values[order])  # the generator's own pd, a ceiling
    same = all(np.allclose(res[n]["federated_scores"], res["lender_a"]["federated_scores"], atol=1e-6) for n in res)

    # Export the federated model (identical on every lender after the last FedAvg round).
    st = res["lender_a"]["federated_model"]["state_dict"]
    coef = [float(c) for c in st["models.0.weight"][0]]
    intercept = float(st["models.0.bias"][0])
    raw = test.iloc[order]
    checks = [{"features": {k: float(raw.iloc[i][k]) for k in NAMES}, "fate_pd": res["lender_a"]["federated_scores"][i]}
              for i in range(5)]
    body = {
        "kind": "zishi.pilot-default.homo-lr",
        "fate_version": version("pyfate"),
        "trained_by": "FATE HomoLRClient/HomoLRServer, FedAvg with secure aggregation, standalone multiprocess launcher",
        "parties": {n: r["rows"] for n, r in res.items()},
        "seed": SEED,
        "features": [{"name": n, "transform": tf, "center": c, "scale": s, "meaning": m} for n, tf, c, s, m in FEATURES],
        "coef": coef,
        "intercept": intercept,
        "output": "pd = sigmoid(intercept + sum(coef[i] * (f_i(x_i) - center_i) / scale_i)), f is identity or log1p",
        "checks": checks,
    }
    sha = hashlib.sha256(canonical(body).encode()).hexdigest()
    model = {**body, "sha256": sha, "sha256_of": "canonical JSON of every other field: sorted keys, no spaces, ASCII, numbers as JavaScript JSON.stringify writes them"}
    json.dump(model, open(os.path.join(HERE, "model.json"), "w"), indent=2)
    # Held out pilots for the prior study in web/scripts/fate-prior.ts.
    json.dump({"seed": SEED, "rows": [{**{k: float(raw.iloc[i][k]) for k in NAMES}, "pd_true": float(raw.iloc[i].pd_true)} for i in range(len(raw))]},
              open(os.path.join(OUT, "test_pilots.json"), "w"))

    results = {
        "fate_version": version("pyfate"),
        "python": sys.version.split()[0],
        "framing": "horizontal (homo): three lenders, same features, different pilots",
        "algorithm": f"FATE HomoLR, FedAvg, secure aggregation, {EPOCHS} epochs, batch {BATCH}, adam lr {LR}, l2 0.001, zero init",
        "launcher": "fate.arch.launchers.multiprocess_launcher, standalone computing and federation, one process per party plus arbiter",
        "seed": SEED,
        "rows": {**{n: r["rows"] for n, r in res.items()}, "test_held_out": len(test)},
        "default_rate": {**{n: round(float(parts[n].y.mean()), 4) for n in parts}, "test_held_out": round(float(test.y.mean()), 4)},
        "metrics_on_held_out": arms,
        "federated_model_identical_on_all_lenders": bool(same),
        "model_sha256": sha,
        "data": "synthetic, generated from a fixed seed; not real pilots or loans",
    }
    old = {}
    rp = os.path.join(HERE, "results.json")
    if os.path.exists(rp):
        old = json.load(open(rp))
    if "prior_effect" in old and old.get("model_sha256") == sha:
        results["prior_effect"] = old["prior_effect"]
    json.dump(results, open(rp, "w"), indent=2)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
