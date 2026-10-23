"""The agent loop: call the model, run requested tools, feed results back,
stop when the model submits a resolution. Includes guardrails on the output."""
from dataclasses import dataclass
from typing import Any, Literal, Protocol

from pydantic import BaseModel, Field, ValidationError

from .prompts import SYSTEM_PROMPT
from .schemas import TOOL_SCHEMAS


class AgentError(Exception):
    """The run failed in a way the caller may want to retry."""


class ProposedAction(BaseModel):
    type: Literal["refund"]
    order_id: str
    amount: float = Field(gt=0)


class Resolution(BaseModel):
    category: Literal["billing", "shipping", "refund", "technical", "account", "other"]
    priority: Literal["low", "normal", "high", "urgent"]
    summary: str = Field(min_length=3)
    draft_reply: str = Field(min_length=10)
    proposed_action: ProposedAction | None = None
    confidence: float = Field(ge=0, le=1)


class Executor(Protocol):
    async def execute(self, name: str, args: dict) -> str: ...


@dataclass
class AgentResult:
    resolution: Resolution
    trace: list[dict]


def render_ticket(customer_email: str, subject: str, body: str) -> str:
    return (
        "<ticket>\n"
        f"From: {customer_email}\nSubject: {subject}\n\n{body}\n"
        "</ticket>\n\nTriage this ticket."
    )


def _block_to_dict(block: Any) -> dict:
    if block.type == "tool_use":
        return {"type": "tool_use", "id": block.id, "name": block.name, "input": block.input}
    return {"type": "text", "text": getattr(block, "text", "")}


def _check_grounding(resolution: Resolution, trace: list[dict]) -> None:
    """A refund may only be proposed for an order the agent actually looked up."""
    action = resolution.proposed_action
    if not action:
        return
    seen = {
        str(t["input"].get("order_id", "")).upper()
        for t in trace
        if t["tool"] == "lookup_order" and "error" not in t["output"][:20]
    }
    if action.order_id.upper() not in seen:
        raise AgentError(f"Refund proposed for {action.order_id}, which was never looked up")


async def run_agent(
    client: Any,
    executor: Executor,
    *,
    model: str,
    customer_email: str,
    subject: str,
    body: str,
    max_steps: int = 6,
) -> AgentResult:
    messages: list[dict] = [
        {"role": "user", "content": render_ticket(customer_email, subject, body)}
    ]
    trace: list[dict] = []

    for _ in range(max_steps):
        resp = await client.messages.create(
            model=model,
            max_tokens=1500,
            system=SYSTEM_PROMPT,
            tools=TOOL_SCHEMAS,
            messages=messages,
        )
        messages.append({"role": "assistant", "content": [_block_to_dict(b) for b in resp.content]})

        tool_uses = [b for b in resp.content if b.type == "tool_use"]
        if not tool_uses:
            messages.append(
                {"role": "user", "content": "Finish by calling the submit_resolution tool."}
            )
            continue

        results = []
        for tu in tool_uses:
            if tu.name == "submit_resolution":
                try:
                    resolution = Resolution.model_validate(tu.input)
                except ValidationError as e:
                    raise AgentError(f"Invalid resolution from model: {e.errors()[0]['msg']}") from e
                _check_grounding(resolution, trace)
                return AgentResult(resolution, trace)

            output = await executor.execute(tu.name, dict(tu.input))
            trace.append({"tool": tu.name, "input": dict(tu.input), "output": output[:2000]})
            results.append({"type": "tool_result", "tool_use_id": tu.id, "content": output})
        messages.append({"role": "user", "content": results})

    raise AgentError(f"No resolution submitted within {max_steps} steps")
