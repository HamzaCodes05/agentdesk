"""Tool definitions in Anthropic tool-use format. No heavy imports here so tests stay fast."""

TOOL_SCHEMAS: list[dict] = [
    {
        "name": "lookup_customer",
        "description": "Look up a customer by email. Returns name, tier and their recent orders.",
        "input_schema": {
            "type": "object",
            "properties": {"email": {"type": "string"}},
            "required": ["email"],
        },
    },
    {
        "name": "lookup_order",
        "description": "Get full details of one order (status, total, delivery date) by order id, e.g. ORD-1001.",
        "input_schema": {
            "type": "object",
            "properties": {"order_id": {"type": "string"}},
            "required": ["order_id"],
        },
    },
    {
        "name": "search_knowledge_base",
        "description": "Search internal support policies and help articles.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
    {
        "name": "submit_resolution",
        "description": "Final step. Submit the triage result for human review. Call exactly once.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["billing", "shipping", "refund", "technical", "account", "other"],
                },
                "priority": {"type": "string", "enum": ["low", "normal", "high", "urgent"]},
                "summary": {"type": "string", "description": "One-line internal summary."},
                "draft_reply": {"type": "string", "description": "Reply to the customer."},
                "proposed_action": {
                    "type": "object",
                    "description": "Only if policy allows a refund.",
                    "properties": {
                        "type": {"type": "string", "enum": ["refund"]},
                        "order_id": {"type": "string"},
                        "amount": {"type": "number"},
                    },
                    "required": ["type", "order_id", "amount"],
                },
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            },
            "required": ["category", "priority", "summary", "draft_reply", "confidence"],
        },
    },
]
