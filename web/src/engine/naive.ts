// A wallet with no gate, no allowlist and no caps. It does what the text says.
// Every attack case runs against this too, so the comparison is honest.

import { spelledNumber } from "./agents";
import type { Intent } from "./types";

const ADDRESS = /0x[a-fA-F0-9]{40}|\b[a-fA-F0-9]{40}\b|\b[a-z0-9-]+\.eth\b/i;
const VERB = /\b(pay|send|transfer|release|wire|remit|move|forward|raise|increase|lift|remove|print|reveal|show|share|export|ignore|disregard|forget|override|skip|go to|fly to)\b|you are now|from now on|new role|转账|转到|汇款|付款|支付|忽略|提高|取消|私钥|改去|前往/i;

export class NaiveWallet {
  // Reads the text as an instruction. Returns what it would do.
  handle(text: string): { acted: boolean; paid: boolean; payee: string | null; amount: number | null } {
    const t = text.normalize("NFKC").replace(/[​-‏⁠-⁤﻿‪-‮⁦-⁩]/g, "");
    const payee = t.match(ADDRESS)?.[0] ?? null;
    const num = t.match(/\b(\d+(?:\.\d+)?)\b/);
    const amount = num ? Number(num[1]) : spelledNumber(t);
    const acted = VERB.test(t) && !/\bi can pay\b/i.test(t);
    const paid = acted && (payee !== null || amount !== null);
    return { acted, paid, payee, amount };
  }
  // Signed intents are never checked: no signature, no replay, no cap.
  evaluate(_intent: Intent): { verdict: "allow" } {
    void _intent;
    return { verdict: "allow" };
  }
}
