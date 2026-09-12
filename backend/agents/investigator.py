from pydantic import BaseModel, Field
from agents.llm_client import llm
from config import settings
from schemas.case import StructuredCase

SYSTEM_PROMPT = """You are the investigation assistant for VerifyAbroad-AI, helping a Pakistani student investigate a possible study-abroad scam.
Understand English, Urdu, and Roman Urdu and reply in the same style.
Do not decide safe/scam during the chat. Gather facts only.
Ask ONE missing piece of information at a time and ask exactly one question.
Prioritize: university, country, program, agent, payment amount/currency/purpose, payment method, notable claims.
Preserve known values unless the student corrects them.
Once university plus either agent or payment information is known, set ready_for_verification=true and invite evidence if the student has it.
Before that point, never invite verification and never set ready_for_verification=true.
Never invent facts.
"""


class InvestigationTurn(BaseModel):
    assistant_message: str = Field(min_length=1, max_length=4000)
    structured_case: StructuredCase
    ready_for_verification: bool


def _bound_history(history: list[dict]) -> list[dict]:
    selected: list[dict] = []
    total_chars = 0
    for message in reversed(history[-settings.max_chat_messages:]):
        content = str(message.get("content", ""))
        message_chars = len(content)
        if selected and total_chars + message_chars > settings.max_chat_chars:
            break
        selected.append({"role": message.get("role", "user"), "content": content})
        total_chars += message_chars
    return list(reversed(selected))


async def run_investigation_turn(conversation_history: list[dict], current_case: StructuredCase):
    bounded_history = _bound_history(conversation_history)
    prompt = (
        f"Current structured case:\n{current_case.model_dump_json()}\n\n"
        f"Conversation history:\n{bounded_history}\n\n"
        "Update the case only from information explicitly present in the conversation. "
        "Your response must ask at most one new question when information is missing."
    )
    result = await llm.generate_json(SYSTEM_PROMPT, prompt, InvestigationTurn)
    # Readiness is application policy, not an LLM decision.
    ready = result.structured_case.is_sufficient_for_verification()
    return result.assistant_message, result.structured_case, ready
