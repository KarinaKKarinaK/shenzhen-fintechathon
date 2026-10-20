"""Tiny JSON-RPC shim in front of the FISCO BCOS Web3 RPC.

FISCO rejects requests without a "params" field, while forge, cast and viem omit it
for calls like eth_gasPrice, and returns an empty "0x" logsBloom that strict clients
refuse to decode. This adds "params": [], pads logsBloom to 256 zero bytes, fills the block
header fields it leaves out and
forwards everything else as is, one request at a time.
Usage: python3 fisco_rpc_proxy.py <listen_port> <upstream_url>
"""
import json
import sys
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8545
UPSTREAM = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8547"


LOCK = threading.Lock()  # the node aborts under bursts of parallel requests, so send one at a time


def fix(msg):
    if isinstance(msg, dict) and "params" not in msg:
        msg["params"] = []
    return msg


ZERO32 = "0x" + "00" * 32
BLOCK_DEFAULTS = {"parentHash": ZERO32, "miner": "0x" + "00" * 20, "mixHash": ZERO32, "baseFeePerGas": "0x0"}


def pad(node):
    if isinstance(node, dict):
        if node.get("logsBloom") == "0x":
            node["logsBloom"] = "0x" + "00" * 256
        if "transactionsRoot" in node:  # a block: fill header fields FISCO leaves out
            for k, v in BLOCK_DEFAULTS.items():
                node.setdefault(k, v)
        for v in node.values():
            pad(v)
    elif isinstance(node, list):
        for v in node:
            pad(v)
    return node


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("content-length", 0))) or b"{}")
        body = [fix(m) for m in body] if isinstance(body, list) else fix(body)
        req = urllib.request.Request(UPSTREAM, json.dumps(body).encode(), {"content-type": "application/json"})
        with LOCK, urllib.request.urlopen(req, timeout=30) as r:
            out = json.dumps(pad(json.loads(r.read()))).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def log_message(self, *args):
        pass


ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
