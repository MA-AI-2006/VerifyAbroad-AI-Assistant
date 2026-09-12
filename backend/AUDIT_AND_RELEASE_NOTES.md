# VerifyAbroad-AI Backend — Audit & Release Notes

Audit date: 2026-09-11

## Verified in this environment

- All 58 release files were read/validated; JSON files parse successfully and the supplied knowledge-base PDF text was readable.
- `python -m compileall -q .` passes.
- `python tests/test_smoke.py` passes.
- `pytest -q`: 3 passed, 1 skipped.
- HEC dataset remains empty: `institutions=[]`.
- Banned-agent dataset remains empty: `agents=[]`.
- Tavily and Gemini Google Search remain independent, parallel research sources.
- Current configured model identifiers were checked against current provider documentation.

## What was hardened

- Fixed dead urgency risk rule.
- Wired `contradicted_program` and `payment_process_mismatch` rules.
- Restricted final LLM output to narrative fields; evidence/domain tree is assembled deterministically.
- Constructed `ManualCheck` objects rather than raw dictionaries.
- Added timeouts and logging across external-provider paths.
- Normalizer now degrades a failed source to `UNABLE_TO_VERIFY` rather than killing the whole run.
- Added request/file validation and evidence size limits.
- Added MIME/content validation for uploaded images/PDFs.
- Added real DB + Hipo health checks.
- Added production-safe migration/startup behavior and initial Alembic migration.
- Verification now processes all uploaded evidence items.
- Verification failures rollback partial evidence and persist `verification_failed` cleanly.
- Verification is serialized with a Postgres row lock to prevent duplicate concurrent runs.
- Failed evidence DB commits clean up the already-uploaded storage object where possible.
- Added conservative student-facing display mapping; LOW risk is not automatically called VERIFIED.
- Added mocked end-to-end API coverage.

## Important unverified item

A truly fresh `venv` install could not be completed in this execution environment because outbound DNS/network access to PyPI is unavailable. Therefore live dependency resolution and provider calls were not claimed as tested.

The release requirements were updated using current published package/model information, but the final install must still be executed in a networked environment.

## Still required before public deployment

1. Put real provider keys in a private `.env`.
2. Populate the real HEC recognized-institutions dataset.
3. Populate the real banned/warned/reported-agent dataset from sourced records.
4. Run `alembic upgrade head` against production Postgres.
5. Seed the RAG knowledge base with the Gemini embedding key.
6. Set `ALLOWED_ORIGINS` to the deployed frontend origin(s).
7. Exercise the live provider path once from the deployment environment.

## Post-release correction: Groq strict Structured Outputs

A live runtime test on 2026-09-11 exposed one additional provider-compatibility bug that was not visible in the original sandbox test suite:

- Gemini returned HTTP 503 because `gemini-3.8-flash` was temporarily experiencing high demand.
- The Groq fallback then returned HTTP 400 because the nested Pydantic JSON Schema did not set `additionalProperties: false` on every object. Groq strict mode also requires every declared property to appear in `required`.

This release fixes that centrally in `agents/schema_utils.py` and applies it to every Groq structured-generation path, including multimodal extraction. Nullable Pydantic fields remain nullable; they are simply emitted as required schema properties so Groq strict mode can accept the schema.

Regression coverage:
- `tests/test_groq_schema.py` verifies the root and nested object requirements.
- `pytest -q` => 4 passed, 1 skipped in the sandbox.

The skip remains provider-dependent only; no live provider credential test is claimed here.
