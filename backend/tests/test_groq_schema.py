"""Regression test for Groq strict JSON-schema compatibility."""
from agents.schema_utils import groq_strict_schema
from schemas.case import StructuredCase


def test_groq_strict_schema_closes_and_requires_nested_objects():
    schema = groq_strict_schema(StructuredCase.model_json_schema())

    assert schema["additionalProperties"] is False
    assert set(schema["required"]) == set(schema["properties"])

    for definition in schema.get("$defs", {}).values():
        if "properties" in definition:
            assert definition["additionalProperties"] is False
            assert set(definition["required"]) == set(definition["properties"])
