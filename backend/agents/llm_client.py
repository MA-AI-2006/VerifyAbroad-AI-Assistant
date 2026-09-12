"""Unified LLM client: Gemini primary, Groq fallback, with schema validation and timeouts."""
import asyncio
import base64
import json
import logging
from typing import TypeVar, Type

from pydantic import BaseModel
from google import genai
from google.genai import types
from groq import AsyncGroq

from config import settings

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)

_gemini = genai.Client(api_key=settings.gemini_api_key) if settings.gemini_api_key else None
_groq = AsyncGroq(api_key=settings.groq_api_key) if settings.groq_api_key else None

CHAT_MODEL = settings.gemini_model
VISION_MODEL = settings.gemini_model
EMBEDDING_MODEL = settings.gemini_embedding_model
GROQ_MODEL = settings.groq_model


class LLMClient:
    async def _gemini(self, contents, config=None):
        if not _gemini:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        return await asyncio.wait_for(
            asyncio.to_thread(
                _gemini.models.generate_content,
                model=CHAT_MODEL,
                contents=contents,
                config=config,
            ),
            timeout=settings.llm_timeout_seconds,
        )

    async def _groq(self, messages, schema: dict | None = None, json_mode: bool = False):
        if not _groq:
            raise RuntimeError("GROQ_API_KEY is not configured")
        kwargs = {
            "model": GROQ_MODEL,
            "messages": messages,
            "temperature": 0,
            "timeout": settings.llm_timeout_seconds,
        }
        if schema is not None:
            kwargs["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": "verifyabroad_output",
                    "strict": True,
                    "schema": schema,
                },
            }
        elif json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        response = await _groq.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    @staticmethod
    def _gemini_json_config(schema: Type[T]) -> types.GenerateContentConfig:
        return types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
            max_output_tokens=4096,
        )

    @staticmethod
    def _groq_strict_schema(schema: dict) -> dict:
        """Normalize a Pydantic schema for Groq strict Structured Outputs."""
        from agents.schema_utils import groq_strict_schema
        return groq_strict_schema(schema)

    async def generate_text(self, system: str, user: str) -> str:
        try:
            response = await self._gemini(
                f"SYSTEM:\n{system}\n\nUSER:\n{user}",
                types.GenerateContentConfig(max_output_tokens=4096),
            )
            return response.text or ""
        except Exception as gemini_exc:
            logger.warning("Gemini text generation failed; using Groq fallback: %s", gemini_exc, exc_info=True)
            try:
                return await self._groq([
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ])
            except Exception as groq_exc:
                logger.error("Groq text fallback failed: %s", groq_exc, exc_info=True)
                raise RuntimeError("All configured LLM providers failed for text generation") from groq_exc

    async def generate_json(self, system: str, user: str, schema: Type[T]) -> T:
        schema_json = schema.model_json_schema()
        try:
            response = await self._gemini(
                f"SYSTEM:\n{system}\n\nUSER:\n{user}",
                self._gemini_json_config(schema),
            )
            return schema.model_validate_json(response.text)
        except Exception as gemini_exc:
            logger.warning("Gemini structured generation failed; using Groq fallback: %s", gemini_exc, exc_info=True)
            try:
                raw = await self._groq(
                    [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    schema=self._groq_strict_schema(schema_json),
                    json_mode=True,
                )
                return schema.model_validate_json(raw)
            except Exception as groq_exc:
                logger.error("Groq structured fallback failed: %s", groq_exc, exc_info=True)
                raise RuntimeError("All configured LLM providers failed for structured generation") from groq_exc

    async def _groq_multimodal_json(self, system: str, user: str, images: list[tuple[bytes, str]], schema: Type[T]) -> T:
        b64_images = [
            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{base64.b64encode(data).decode('utf-8')}"}}
            for data, mime in images[:3]
        ]
        raw = await self._groq(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": [{"type": "text", "text": user}, *b64_images]},
            ],
            schema=self._groq_strict_schema(schema.model_json_schema()),
            json_mode=True,
        )
        return schema.model_validate_json(raw)

    async def generate_multimodal_json(
        self, system: str, user: str, data: bytes, mime_type: str, schema: Type[T]
    ) -> T:
        part = types.Part.from_bytes(data=data, mime_type=mime_type)
        try:
            response = await self._gemini(
                [part, f"SYSTEM:\n{system}\n\nTASK:\n{user}"],
                self._gemini_json_config(schema),
            )
            return schema.model_validate_json(response.text)
        except Exception as gemini_exc:
            logger.warning("Gemini multimodal extraction failed; using Groq fallback: %s", gemini_exc, exc_info=True)

        try:
            if mime_type == "application/pdf":
                # Groq supports images, not PDF input. Convert up to three pages to images;
                # prefer extracted PDF text when available so multi-page text documents survive fallback.
                import fitz

                with fitz.open(stream=data, filetype="pdf") as doc:
                    text = "\n\n".join(page.get_text() for page in doc)[: settings.max_evidence_text_chars]
                    if text.strip():
                        return await self.generate_json(system, f"{user}\n\nExtracted PDF text:\n{text}", schema)
                    images: list[tuple[bytes, str]] = []
                    for index in range(min(3, len(doc))):
                        pix = doc.load_page(index).get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
                        images.append((pix.tobytes("png"), "image/png"))
                if images:
                    return await self._groq_multimodal_json(system, user, images, schema)
                raise RuntimeError("PDF contains no extractable text or renderable pages")

            return await self._groq_multimodal_json(system, user, [(data, mime_type)], schema)
        except Exception as groq_exc:
            logger.error("Groq multimodal fallback failed: %s", groq_exc, exc_info=True)
            raise RuntimeError("All configured LLM providers failed for multimodal extraction") from groq_exc

    async def embed(self, text: str) -> list[float]:
        if not _gemini:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(
                    _gemini.models.embed_content,
                    model=EMBEDDING_MODEL,
                    contents=text,
                ),
                timeout=settings.llm_timeout_seconds,
            )
            if not result.embeddings or not result.embeddings[0].values:
                raise RuntimeError("Gemini embedding response contained no values")
            return [float(v) for v in result.embeddings[0].values]
        except Exception:
            logger.exception("Gemini embedding generation failed")
            raise

    async def embed_many(self, texts: list[str]) -> list[list[float]]:
        return await asyncio.gather(*(self.embed(t) for t in texts))

    async def google_search(self, prompt: str) -> dict:
        if not _gemini:
            return {"error": "GEMINI_API_KEY is not configured", "answer": None}
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    _gemini.models.generate_content,
                    model=CHAT_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        tools=[types.Tool(google_search=types.GoogleSearch())],
                        max_output_tokens=5000,
                    ),
                ),
                timeout=settings.llm_timeout_seconds,
            )
            grounding = None
            if response.candidates:
                metadata = getattr(response.candidates[0], "grounding_metadata", None)
                if metadata is not None and hasattr(metadata, "model_dump"):
                    grounding = metadata.model_dump(mode="json")
            return {"answer": response.text or "", "grounding": grounding}
        except Exception as exc:
            logger.warning("Gemini Google Search grounding failed: %s", exc, exc_info=True)
            return {"error": str(exc), "answer": None}


llm = LLMClient()
