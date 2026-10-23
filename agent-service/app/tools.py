import json
from urllib.parse import quote

import httpx


class ToolExecutor:
    """Executes read-only tools by calling the NestJS internal endpoints.
    Errors are returned as JSON text so the model can recover instead of crashing the run."""

    def __init__(self, base_url: str, internal_key: str):
        self._http = httpx.AsyncClient(
            base_url=base_url, headers={"x-internal-key": internal_key}, timeout=10
        )

    async def execute(self, name: str, args: dict) -> str:
        try:
            if name == "lookup_customer":
                r = await self._http.get(f"/internal/customers/{quote(str(args['email']), safe='')}")
            elif name == "lookup_order":
                r = await self._http.get(f"/internal/orders/{quote(str(args['order_id']), safe='')}")
            elif name == "search_knowledge_base":
                r = await self._http.get("/internal/kb/search", params={"q": str(args["query"])})
            else:
                return json.dumps({"error": f"Unknown tool: {name}"})

            if r.status_code == 404:
                return json.dumps({"error": "not found"})
            r.raise_for_status()
            return r.text
        except (httpx.HTTPError, KeyError) as e:
            return json.dumps({"error": f"tool failed: {e}"})

    async def aclose(self) -> None:
        await self._http.aclose()
