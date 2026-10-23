import asyncio
import json
import sys
from pathlib import Path
from types import SimpleNamespace as NS

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agent import AgentError, run_agent  # noqa: E402


def tool_use(id_, name, **input_):
    return NS(type="tool_use", id=id_, name=name, input=input_)


class FakeClient:
    """Plays back scripted model turns. Repeats the last turn when exhausted."""

    def __init__(self, turns):
        self.turns = list(turns)
        self.calls = 0
        self.messages = self

    async def create(self, **_):
        turn = self.turns[min(self.calls, len(self.turns) - 1)]
        self.calls += 1
        return NS(content=turn)


class FakeExecutor:
    def __init__(self, outputs):
        self.outputs = outputs
        self.called = []

    async def execute(self, name, args):
        self.called.append((name, args))
        return self.outputs.get(name, json.dumps({"error": "not found"}))


GOOD = dict(
    category="refund",
    priority="normal",
    summary="Refund request for earbuds",
    draft_reply="Hi Alice, we're sorry the earbuds didn't work out. A refund is on its way for review.",
    confidence=0.9,
)


def run(client, executor, **kw):
    return asyncio.run(
        run_agent(
            client,
            executor,
            model="test",
            customer_email="alice@example.com",
            subject="Refund please",
            body="My earbuds ORD-1001 are bad",
            **kw,
        )
    )


def test_happy_path_looks_up_then_submits_refund():
    client = FakeClient(
        [
            [tool_use("t1", "lookup_order", order_id="ORD-1001")],
            [
                tool_use(
                    "t2",
                    "submit_resolution",
                    proposed_action={"type": "refund", "order_id": "ord-1001", "amount": 59},
                    **GOOD,
                )
            ],
        ]
    )
    ex = FakeExecutor({"lookup_order": json.dumps({"id": "ORD-1001", "total": 59})})
    result = run(client, ex)

    assert result.resolution.category == "refund"
    assert result.resolution.proposed_action.amount == 59
    assert [t["tool"] for t in result.trace] == ["lookup_order"]
    assert ex.called == [("lookup_order", {"order_id": "ORD-1001"})]


def test_refund_for_unlooked_up_order_is_rejected():
    client = FakeClient(
        [[tool_use("t1", "submit_resolution",
                   proposed_action={"type": "refund", "order_id": "ORD-9999", "amount": 10}, **GOOD)]]
    )
    with pytest.raises(AgentError, match="never looked up"):
        run(client, FakeExecutor({}))


def test_failed_lookup_does_not_ground_a_refund():
    client = FakeClient(
        [
            [tool_use("t1", "lookup_order", order_id="ORD-5")],
            [tool_use("t2", "submit_resolution",
                      proposed_action={"type": "refund", "order_id": "ORD-5", "amount": 10}, **GOOD)],
        ]
    )
    with pytest.raises(AgentError, match="never looked up"):
        run(client, FakeExecutor({}))  # executor returns an error payload


def test_invalid_category_is_rejected():
    bad = {**GOOD, "category": "banana"}
    client = FakeClient([[tool_use("t1", "submit_resolution", **bad)]])
    with pytest.raises(AgentError, match="Invalid resolution"):
        run(client, FakeExecutor({}))


def test_gives_up_after_max_steps():
    client = FakeClient([[tool_use("t1", "search_knowledge_base", query="refund")]])
    with pytest.raises(AgentError, match="within 3 steps"):
        run(client, FakeExecutor({}), max_steps=3)
    assert client.calls == 3


def test_no_refund_needed_succeeds_without_action():
    client = FakeClient(
        [[tool_use("t1", "submit_resolution", **{**GOOD, "category": "account", "confidence": 0.8})]]
    )
    result = run(client, FakeExecutor({}))
    assert result.resolution.proposed_action is None
