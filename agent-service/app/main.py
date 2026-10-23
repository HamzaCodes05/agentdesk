import time
from contextlib import asynccontextmanager

from anthropic import AsyncAnthropic
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from .agent import AgentError, ProposedAction, run_agent
from .config import settings
from .tools import ToolExecutor


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.llm = AsyncAnthropic(api_key=settings.anthropic_api_key or "missing")
    app.state.tools = ToolExecutor(settings.api_base_url, settings.internal_api_key)
    yield
    await app.state.tools.aclose()


app = FastAPI(title="AgentDesk Agent Service", lifespan=lifespan)


def require_internal_key(x_internal_key: str = Header(default="")) -> None:
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(401, "Invalid internal key")


class RunRequest(BaseModel):
    ticket_id: str
    customer_email: str
    subject: str
    body: str


class RunResponse(BaseModel):
    category: str
    priority: str
    summary: str
    draft_reply: str
    proposed_action: ProposedAction | None
    confidence: float
    trace: list[dict]
    model: str
    duration_ms: int


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/run", response_model=RunResponse, dependencies=[Depends(require_internal_key)])
async def run(req: RunRequest):
    if not settings.anthropic_api_key:
        raise HTTPException(503, "ANTHROPIC_API_KEY is not configured")

    started = time.perf_counter()
    try:
        result = await run_agent(
            app.state.llm,
            app.state.tools,
            model=settings.anthropic_model,
            customer_email=req.customer_email,
            subject=req.subject,
            body=req.body,
            max_steps=settings.max_steps,
        )
    except AgentError as e:
        raise HTTPException(502, str(e)) from e

    return RunResponse(
        **result.resolution.model_dump(),
        trace=result.trace,
        model=settings.anthropic_model,
        duration_ms=int((time.perf_counter() - started) * 1000),
    )
