"""The conversational investigator.

Primary path is an LLM (Gemini, Groq fallback) with strict structured output.
Every failure mode — no key, provider outage, invalid JSON — falls through to
`agents.facts`, the deterministic extractor, so a demo never 502s and the case
still fills in. The LLM never scores risk and never decides "scam"; readiness is
application policy, computed from the case, not from the model.
"""
from __future__ import annotations

import logging

from pydantic import BaseModel, Field

from agents import facts
from agents.llm_client import llm
from config import settings
from schemas.case import StructuredCase

logger = logging.getLogger(__name__)

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


#: Frontend language code -> short style instruction for the LLM.
LANGUAGE_STYLE = {
    "english": "Reply in English.",
    "roman_urdu": "Reply in Roman Urdu (Urdu written in Latin script), simple and warm.",
    "urdu": "Reply in Urdu script.",
}

OPENING = {
    "english": "I'll help you check this before you pay or sign anything. Which university is it for?",
    "roman_urdu": "Main aap ko payment ya signature se pehle cheez check karne mein madad karunga. Kaunsi university hai?",
    "urdu": "میں آپ کو پیسے دینے یا دستخط کرنے سے پہلے چیک کرنے میں مدد کروں گا۔ کون سی یونیورسٹی ہے؟",
}

FIELD_QUESTION = {
    "english": {
        "university": "Which university or college is this for?",
        "country": "Which country is this in?",
        "program": "Which program or course is it?",
        "agent": "Did you go through a consultant or agent? If yes, what is their name?",
        "payment_amount": "How much did they ask you to pay (amount and currency)?",
        "payment_purpose": "What exactly is that payment for?",
        "payment_method": "How were you asked to pay — bank transfer, university portal, wallet, or cash?",
        "evidence": "Do you have any proof you can share: the offer letter, invoice, WhatsApp message, or a link? Attach it and I will read it.",
        "done": "I have enough to run the verification checks. You can attach evidence, or run verification whenever you are ready.",
    },
    "roman_urdu": {
        "university": "Yeh kis university ya college ka case hai?",
        "country": "Yeh kis country mein hai?",
        "program": "Kaunsa program ya course hai?",
        "agent": "Kisi consultant ya agent se kariya tha? Agar haan to unka naam kya hai?",
        "payment_amount": "Unhon ne kitni payment mangi hai? (amount aur currency bata dein)",
        "payment_purpose": "Yeh payment kis cheez ke liye hai?",
        "payment_method": "Payment kis tarah mangi gayi — bank transfer, university portal, wallet ya cash?",
        "evidence": "Aap ke paas koi proof hai jo share kar saken: offer letter, invoice, WhatsApp message ya link? Attach kariye, main parh lunga.",
        "done": "Ab mere paas verification check chalane ke liye kaafi information hai. Evidence attach kariye ya verification chala lijiye.",
    },
    "urdu": {
        "university": "یہ کس یونیورسٹی یا کالج کا کیس ہے؟",
        "country": "یہ کس ملک میں ہے؟",
        "program": "کونسا پروگرام یا کورس ہے؟",
        "agent": "کیا آپ نے کسی کنسلٹنٹ یا ایجنٹ کے ذریعے کام کیا؟ اگر ہاں تو ان کا نام کیا ہے؟",
        "payment_amount": "انہوں نے کتنی ادائیگی مانگی ہے؟ (رقم اور کرنسی بتائیں)",
        "payment_purpose": "یہ ادائیگی کس چیز کے لیے ہے؟",
        "payment_method": "ادائیگی کس ذریعے سے کہی گئی — بینک ٹرانسفر، یونیورسٹی پورٹل، والیٹ یا کیش؟",
        "evidence": "کیا آپ کے پاس کوئی ثبوت شیئر کرنے کے لیے ہے: آفر لیٹر، انوائس، واٹس ایپ پیغام یا لنک؟ منسلک کریں، میں پڑھ لوں گا۔",
        "done": "اب میرے پاس تصدیقی چیک چلانے کے لیے کافی معلومات ہیں۔ ثبوت منسلک کریں یا تصدیق چلا لیں۔",
    },
}

MISSING_ORDER = [
    "university", "country", "program", "agent",
    "payment_amount", "payment_purpose", "payment_method",
]

FIELD_LABEL = {
    "university": "university", "country": "country", "program": "program",
    "agent": "consultant/agent", "payment_amount": "payment amount",
    "payment_purpose": "payment purpose", "payment_method": "payment method",
}


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


def merge_facts(case: StructuredCase, new_facts: dict, *, extend_claims: bool = True) -> StructuredCase:
    """Record only facts the student actually stated; never drop known values."""
    updates: dict = {}
    for field in (
        "university", "country", "program", "agent", "scholarship", "degree_level",
        "funding_type", "currency", "payment_amount", "payment_method", "payment_purpose",
    ):
        value = new_facts.get(field)
        if value is None:
            continue
        if getattr(case, field, None) in (None, ""):
            updates[field] = value
    if extend_claims and new_facts.get("claims"):
        merged = list(case.claims)
        for claim in new_facts["claims"]:
            if claim.lower() not in {existing.lower() for existing in merged}:
                merged.append(claim[:500])
        updates["claims"] = merged[:50]
    return case.model_copy(update=updates) if updates else case


def next_question(case: StructuredCase, language: str) -> tuple[str, bool]:
    style = LANGUAGE_STYLE.get(language, LANGUAGE_STYLE["english"])
    missing = [field for field in MISSING_ORDER if getattr(case, field, None) in (None, "")]
    if not missing:
        return (style and _text(language, "done")), True
    if case.university and case.payment_amount is None and "payment_amount" in missing:
        return _text(language, "payment_amount"), False
    return _text(language, missing[0]), False


def _text(language: str, key: str) -> str:
    table = FIELD_QUESTION.get(language) or FIELD_QUESTION["english"]
    return table.get(key) or FIELD_QUESTION["english"].get(key) or "Can you share that detail?"


def offline_turn(history: list[dict], case: StructuredCase, language: str = "roman_urdu"):
    """Deterministic investigator: extract from every student message, ask for one gap."""
    student_lines = [
        str(message.get("content", ""))
        for message in history
        if message.get("role") in (None, "user")
    ]
    corpus = "\n".join(student_lines)
    merged = merge_facts(case, facts.extract_facts(corpus))

    first_turn = len(student_lines) <= 1
    known = [
        f"{label}: {getattr(merged, field)}"
        for field, label in (
            ("university", "University"), ("country", "Country"), ("program", "Program"),
            ("agent", "Consultant"), ("payment_amount", "Amount"),
        )
        if getattr(merged, field, None) not in (None, "")
    ]

    question, _ = next_question(merged, language)
    ready = merged.is_sufficient_for_verification()
    ready = merged.is_sufficient_for_verification()

    if merged.claims:
        claim_line = merged.claims[-1]
        if language == "english":
            promise = f' I noted that they said: "{claim_line}" — that is the kind of claim we will check.'
        elif language == "urdu":
            promise = f' میں نے نوٹ کیا کہ انہوں نے کہا: "{claim_line}" — یہی وہ دعویٰ ہے جس کی تصدیق کریں گے۔'
        else:
            promise = f' Main note kar raha hoon ke unhon ne kaha: "{claim_line}" — yehi woh claim hai jo hum check karenge.'
    else:
        promise = ""

    if first_turn and not known:
        recap = OPENING.get(language, OPENING["english"])
        message = f"{recap}{promise}"
    elif known:
        recap_label = {
            "english": "So far I have: ",
            "roman_urdu": "Abhi tak mere paas: ",
            "urdu": "ابھی تک میرے پاس: ",
        }.get(language, "Abhi tak mere paas: ")
        message = f"{recap_label}{', '.join(known)}.{promise} {question}".strip()
    else:
        message = f"{question}{promise}".strip()

    return message[:4000], merged, ready


async def run_investigation_turn(
    conversation_history: list[dict],
    current_case: StructuredCase,
    *,
    language: str = "roman_urdu",
):
    """Returns (assistant_message, updated_case, ready_for_verification)."""
    bounded_history = _bound_history(conversation_history)
    if not settings.llm_available:
        return offline_turn(bounded_history, current_case, language)

    prompt = (
        f"Reply language: {LANGUAGE_STYLE.get(language, LANGUAGE_STYLE['english'])}\n\n"
        f"Current structured case:\n{current_case.model_dump_json()}\n\n"
        f"Conversation history:\n{bounded_history}\n\n"
        "Update the case only from information explicitly present in the conversation. "
        "Your response must ask at most one new question when information is missing."
    )
    try:
        result = await llm.generate_json(SYSTEM_PROMPT, prompt, InvestigationTurn)
        # Salvage anything the model missed but the student plainly stated.
        merged = merge_facts(result.structured_case, facts.extract_facts(
            "\n".join(str(m.get("content", "")) for m in bounded_history if m.get("role") != "assistant")
        ))
        message = (result.assistant_message or "").strip() or offline_turn(bounded_history, merged, language)[0]
        ready = merged.is_sufficient_for_verification()
        return message[:4000], merged, ready
    except Exception as exc:  # provider outage, quota, invalid JSON, timeout
        logger.warning("LLM investigator unavailable (%s); using deterministic extraction", exc)
        if not settings.offline_fallbacks:
            raise
    return offline_turn(bounded_history, current_case, language)
