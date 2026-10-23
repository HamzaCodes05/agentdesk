"""Runs labelled tickets through the live agent service and reports accuracy.

Usage (stack must be running, with a real ANTHROPIC_API_KEY):
    python evals/run_evals.py [--url http://localhost:8000] [--key change-me-internal]
"""
import argparse
import json
import sys
import time
from pathlib import Path

import httpx

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://localhost:8000")
parser.add_argument("--key", default="change-me-internal")
args = parser.parse_args()

cases = json.loads((Path(__file__).parent / "cases.json").read_text())
passed = 0

print(f"{'case':<50} {'category':<10} {'refund':<7} {'conf':<5} {'time':<6} result")
for case in cases:
    started = time.perf_counter()
    try:
        r = httpx.post(
            f"{args.url}/run",
            headers={"x-internal-key": args.key},
            json={k: case[k] for k in ("customer_email", "subject", "body")} | {"ticket_id": "eval"},
            timeout=90,
        )
        r.raise_for_status()
        out = r.json()
    except httpx.HTTPError as e:
        print(f"{case['name']:<50} ERROR {e}")
        continue

    got_refund = out["proposed_action"] is not None
    ok = out["category"] == case["expect_category"] and got_refund == case["expect_refund"]
    passed += ok
    print(
        f"{case['name']:<50} {out['category']:<10} {str(got_refund):<7} "
        f"{out['confidence']:<5.2f} {time.perf_counter() - started:<5.1f}s {'PASS' if ok else 'FAIL'}"
    )

print(f"\n{passed}/{len(cases)} passed")
sys.exit(0 if passed == len(cases) else 1)
