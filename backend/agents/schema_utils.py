"""JSON Schema helpers for provider-specific structured-output requirements."""
from __future__ import annotations

import copy


def groq_strict_schema(schema: dict) -> dict:
    """Normalize a Pydantic JSON Schema for Groq strict Structured Outputs.

    Groq strict mode requires every object to set ``additionalProperties: false``
    and every declared property to be listed in ``required``. Pydantic commonly
    leaves fields with defaults out of ``required``; those fields remain
    semantically nullable/optional in their property schema, but are required to
    be present in the generated object.
    """
    normalized = copy.deepcopy(schema)

    def visit(node):
        if isinstance(node, dict):
            properties = node.get("properties")
            if isinstance(properties, dict):
                node["additionalProperties"] = False
                node["required"] = list(properties.keys())
            for value in node.values():
                visit(value)
        elif isinstance(node, list):
            for value in node:
                visit(value)

    visit(normalized)
    return normalized
