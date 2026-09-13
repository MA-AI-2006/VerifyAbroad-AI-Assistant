"""Deterministic fact extraction.

Used by the keyless chat fallback and the evidence-parser fallback. It is
deliberately conservative: it records only what is literally present in the text,
never infers a university, amount or claim the student did not write, and never
decides whether something is a scam.

Every pattern here is anchored on evidence-shaped text (a capitalized name next to
"University", an explicit "agent name is X", a number next to a currency token) so
Roman Urdu, Urdu and English input all work without inventing fields.
"""
from __future__ import annotations

import re

COUNTRIES = [
    "United Kingdom", "UK", "England", "Scotland", "Wales",
    "United States", "USA", "US", "Canada", "Australia", "New Zealand",
    "Germany", "France", "Netherlands", "Ireland", "Italy", "Spain", "Sweden",
    "Norway", "Denmark", "Finland", "Switzerland", "Austria", "Belgium", "Poland",
    "Portugal", "China", "Japan", "South Korea", "Korea", "Singapore", "Malaysia",
    "Turkey", "Turkiye", "UAE", "United Arab Emirates", "Saudi Arabia", "Qatar",
    "Russia", "Ukraine", "Pakistan", "India", "Bangladesh", "Nigeria", "Ghana",
    "Egypt", "South Africa", "Hungary", "Czech Republic", "Czechia", "Lithuania",
    "Latvia", "Estonia", "Romania", "Greece", "Malta", "Cyprus", "Luxembourg",
    "Iceland", "Thailand", "Vietnam", "Indonesia",
]

# Aliases fold into the full country name, because Hipo and Tavily queries are
# built from this value and "UK" retrieves worse than "United Kingdom".
COUNTRY_ALIASES = {
    "uk": "United Kingdom",
    "united kingdom": "United Kingdom",
    "england": "United Kingdom",
    "scotland": "United Kingdom",
    "wales": "United Kingdom",
    "northern ireland": "United Kingdom",
    "britain": "United Kingdom",
    "usa": "United States",
    "us": "United States",
    "america": "United States",
    "netherland": "Netherlands",
    "holland": "Netherlands",
    "deutschland": "Germany",
    "saudi": "Saudi Arabia",
    "uae": "United Arab Emirates",
    "emirat": "United Arab Emirates",
    "dubai": "United Arab Emirates",
    "korea": "South Korea",
    "czechia": "Czech Republic",
}
COUNTRY_LOOKUP = {name.lower(): COUNTRY_ALIASES.get(name.lower(), name) for name in COUNTRIES}
COUNTRY_LOOKUP.update(COUNTRY_ALIASES)

CURRENCY_TOKENS = {
    "pkr": "PKR", "rs": "PKR", "rupee": "PKR", "rupees": "PKR", "inr": "INR",
    "usd": "USD", "dollar": "USD", "dollars": "USD", "gbp": "GBP", "pound": "GBP",
    "pounds": "GBP", "eur": "EUR", "euro": "EUR", "euros": "EUR", "aed": "AED",
    "sar": "SAR", "cad": "CAD", "aud": "AUD", "cny": "CNY", "jpy": "JPY",
    "myr": "MYR", "try": "TRY", "eur": "EUR",
}
CURRENCY_SYMBOLS = {"\u20a8": "PKR", "\u20b9": "INR", "$": "USD", "\u00a3": "GBP", "\u20ac": "EUR"}

RISKY_METHODS = [
    "jazzcash", "jazz cash", "easypaisa", "easy paisa", "sadapay", "nayapay",
    "upaisa", "mobile wallet", "personal account", "personal bank account",
    "my account", "own account", "cash", "western union", "crypto", "bitcoin", "usdt",
]
OFFICIAL_METHODS = [
    "bank transfer", "wire transfer", "official portal", "university portal",
    "demand draft", "giro", "flywire", "si-pay", "payment gateway",
    "directly to the university", "university website",
]
SUSPICIOUS_PURPOSES = [
    "seat booking", "seat reservation", "seat blocking", "visa guarantee",
    "guaranteed visa", "processing fee", "consultancy fee", "booking amount",
    "scholarship release", "unlock", "document verification fee", "admission charge",
    "interview fee", "attestation", "police verification", "medical fee",
    "express processing", "advance fee", "token amount", "security amount",
]
CLAIM_MARKERS = [
    "guarantee", "guaranteed", "100%", "certain", "confirmed", "assured", "assure",
    "promise", "sure shot", "no risk", "refund", "without ielts", "without gre",
    "free visa", "urgent", "immediately", "last seat", "last batch", "limited seats",
    "within 24", "manpower", "any process", "degree equivalent", "attestation from",
]

_TITLE_WORD = r"[A-Z][A-Za-z0-9'\u00c0-\u024f\-]*"
# Name-only words for institution prefixes: excluding digits stops application
# numbers and reference codes ("MM-77120") from being glued onto a university name.
_NAME_WORD = r"[A-Z][A-Za-z'\u00c0-\u024f]{1,20}(?:-[A-Za-z'\u00c0-\u024f]{1,20})*"
_INST_HEADS = r"University|Universit\u00e4t|Universite|Universidade|College|Institute|Polytechnic|Academy|Faculty|School"

# "[Word Word] University|College [of Word Word]" — the head word may be preceded
# or followed by capitalized words, so "Technical University of Munich" and
# "King's College London" both come out whole. The longest candidate wins.
_DEGREE_TOKENS = (
    r"MPhil|MSc|MSC|M\.S\.|MBA|BBA|BSc|B\.S\.|BS|MS|MA|MEng|BEng|LLB|LLM|PhD|Ph\.D\."
    r"|Doctorate|Diploma|Foundation|Undergraduate|Postgraduate|Bachelor|Master"
)
# Words that must not be swallowed into an institution name when they follow it
# ("offer from University of Manchester for MSc Computer Science", "... deposit").
_UNIVERSITY_STOP_AFTER = (
    r"admission|admissions|offer|offers|application|applications|deposit|payment|fee|fees"
    r"|scholarship|stipend|loan|intake|deadline|visa|program|programme|programmes|course"
    r"|courses|semester|term|seat|university|universities|college|institute|institution"
)

_RE_UNIVERSITY = re.compile(
    r"\b((?:(?:" + _NAME_WORD + r")\s+){0,3}?(?:" + _INST_HEADS + r")"
    r"(?:\s+of\s+(?:the\s+|of\s+)?(?:" + _NAME_WORD + r")(?:\s+(?:" + _NAME_WORD + r")){0,2})?"
    r"(?:\s+(?:and|for|the)\s+(?!(?:" + _DEGREE_TOKENS + r")[\w.])"
    r"(?!(?i:" + _UNIVERSITY_STOP_AFTER + r")\\b)(?:" + _NAME_WORD + r"){1,3})?"
    r"(?:\s+(?:" + _NAME_WORD + r")){0,2})"
)
_RE_UNIVERSITY_LOOSE = re.compile(
    r"\b((?:" + _INST_HEADS + r")\s+of\s+[A-Z][A-Za-z\u00c0-\u024f'\-\. ]{2,40}?)(?=[\s,;:]|$)",
    re.IGNORECASE,
)

_RE_PROGRAM = re.compile(
    r"(?<![\w.])(" + _DEGREE_TOKENS + r")(?![\w.])"
    r"[\s:,\-]*(?:in|of|on|:)?[\s\-]*"
    r"((?:" + _TITLE_WORD + r")(?:\s+(?:" + _TITLE_WORD + r")){0,3})"
)
_RE_PROGRAM_LOOSE = re.compile(
    r"\b(?:program|programme|course)\s+(?:in|of|on|for)\s+([A-Za-z][A-Za-z&,\- ]{3,48}?)(?=[\s,.;:!)]|$)",
    re.IGNORECASE,
)
_RE_PROGRAM_AT = re.compile(
    r"\b(?:program|programme|admission|apply|applying|course)\s+(?:in|for|to|at)\s+"
    r"([A-Za-z][A-Za-z&,\- ]{3,48}?)\s+(?:at|in|from)\s+([A-Z][A-Za-z ]{2,40})",
    re.IGNORECASE,
)
_PROGRAM_STOP = re.compile(
    r"\b(?:through|via|with|at|in|for|and|or|from|to|by|which|that|apply|admission"
    r"|consultant|agent|university|college|degree|semester|session|intake)\b",
    re.IGNORECASE,
)

_RE_AMOUNT_PREFIX = re.compile(
    r"(?:rs\.?|pkr|rupees?|amount|fee|charges?|pay(?:ing|ment)?|demanded?|asked?)\s*"
    r"[:\-]?\s*([0-9][0-9,\.]{1,14})\s*(pkr|rupees?|rs\.?|lakhs?|lakh|crores?|crore)?",
    re.IGNORECASE,
)
_RE_AMOUNT_SUFFIX = re.compile(
    r"\b([0-9][0-9,\.]{1,14})\s*(pkr|rupees?|rs|lakhs?|lakh|crores?|crore|usd|gbp|eur|dollars?|pounds?|euros?|aed|sar)\b",
    re.IGNORECASE,
)
_RE_AMOUNT_LEADING_CURRENCY = re.compile(
    r"\b(pkr|inr|usd|gbp|eur|aed|sar|cad|aud|try|myr)\s*([0-9][0-9,\.]{1,14})(?![0-9])",
    re.IGNORECASE,
)
_RE_LAKH = re.compile(r"\b([0-9][0-9,\.]?)\s*(lakhs?|crores?)\b", re.IGNORECASE)
_RE_NUMBER_WITH_CURRENCY = re.compile(
    r"([\$£€\u20a8\u20b9]?\s?[0-9][0-9,\.]{2,14})\s*(pkr|inr|usd|gbp|eur|aed|sar|rs\.?|rupees?)?",
    re.IGNORECASE,
)

_RE_AGENT_IS = re.compile(
    r"(?:agent|consultant|consultancy|advisor|adviser|middleman|agency|company)"
    r"(?:'s|\s+their)?\s*(?:name\s*)?(?:is|:)\s*"
    r"([A-Z][A-Za-z0-9&'\-\. ]{2,60}?)(?=\s*(?:[.!?,;:]|$|\s+(?:and|who|that|for|ne)\b))",
    re.IGNORECASE,
)
# An agency name is a capitalized phrase ending in a business-type word.
_AGENT_SUFFIX = (
    r"Consultants?(?:\s?(?:Pvt\.?|Ltd\.?|Limited))*|Consultancy|Educators?|Education"
    r"|Admissions?|Abroad(?:\s(?:Services|Experts|Planners?))?|Overseas(?:\s(?:Studies|Education|Consulting))?"
    r"|Study\s(?:Abroad|Experts|Mart)|Academy|Group|Solutions|Services|International|Abroad"
)
_RE_AGENT_NAME = re.compile(
    r"\b((?:(?:" + _TITLE_WORD + r")\s+){1,3}(?:" + _AGENT_SUFFIX + r"))(?=[\s,;:!)]|$)"
)
_RE_AGENT_VIA = re.compile(
    r"\b(?:through|via)\s+((?:" + _TITLE_WORD + r"\s+){1,3}(?:" + _AGENT_SUFFIX + r"))",
    re.IGNORECASE,
)
_AGENT_STOPWORDS = {
    "the", "a", "an", "my", "our", "this", "that", "which", "what", "who",
    "university", "college", "institute", "i", "we", "they", "he", "she",
    "please", "kindly", "dear", "sir", "madam",
}

_RE_SCHOLARSHIP_NAME = re.compile(
    r"\b(DAAD|Chevening|Fulbright|Erasmus\+|Commonwealth Scholarship|GKS|KGSP|MEXT"
    r"|Vanier|Australia Awards|Humboldt|CSC|Schwarzman|Turkiye Burslari|FAFSA|HEC Scholarship)\b",
    re.IGNORECASE,
)
_RE_SCHOLARSHIP_MENTION = re.compile(
    r"\b(scholarship|fully funded|full funding|partial funding|stipend|assistantship|financial aid)\b",
    re.IGNORECASE,
)
_RE_DEGREE_LEVEL = re.compile(
    r"(?<![\w.])(" + _DEGREE_TOKENS + r")(?![\w.])", re.IGNORECASE
)
_RE_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")
_RE_URL = re.compile(r"https?://[^\s\"'<>)\]]+", re.IGNORECASE)
_RE_EMAIL = re.compile(r"\b[\w.+\-]+@[\w.\-]+\.[A-Za-z]{2,}\b")
_MONTH = r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Sept|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
_RE_DEADLINE = re.compile(
    r"\b(?:by|before|deadline|last date|due(?:\s+date)?|on or before|valid until|expire[sd]?\s+on)"
    r"\s*[:\-]?\s*"
    r"(" + _MONTH + r"\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{2,4}"
    r"|\d{1,2}(?:st|nd|rd|th)?\s+" + _MONTH + r"\.?,?\s*\d{2,4}"
    r"|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}"
    r"|today|tomorrow|this week|next week|within \d+\s*(?:hours?|days?|weeks?))",
    re.IGNORECASE,
)
_RE_INTAKE = re.compile(
    r"\b(intake|semester)\s*[:\-]?\s*"
    r"((?:Spring|Fall|Autumn|Winter|Summer)(?:\s*\d{2,4})?|" + _MONTH + r"\s*\d{2,4}|\d{4})",
    re.IGNORECASE,
)
_RE_UNIVERSITY_EMAIL_DOMAIN = re.compile(r"@([a-z0-9.\-]*(?:\.edu|\.ac\.[a-z]{2}|\.uni-[a-z.]+))\b", re.IGNORECASE)


def _clean(value: str | None, limit: int = 300) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r"\s+", " ", str(value)).strip(" .,;:!-\"'")
    cleaned = re.sub(r"^(?:the|a|an|my|our)\s+", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+(?:in|for|at|to|mein|ka|ki|ke|hai)$", "", cleaned, flags=re.IGNORECASE)
    return cleaned[:limit] or None


def _is_plausible_institution(value: str) -> bool:
    # A bare "University"/"College" is not a name: require a qualifier.
    if len(value) < 6 or len(value.split()) > 8 or len(value.split()) < 2:
        return False
    lowered = value.lower()
    if re.search(r"\b(?:of|and|the|for)\s*$", lowered):
        # A truncated fragment ("University of the", "... and") is never a name.
        return False
    noise = ("this university", "your university",
             "which university", "what university", "a university", "no university",
             "my university", "that university", "the university is", "the university was")
    return not any(lowered.startswith(prefix) for prefix in noise)


_HEAD_POSITION_RE = re.compile(r"\b(?:" + _INST_HEADS + r")\b")


def _trim_second_institution(candidate: str) -> str:
    """`X University and Y University` names two institutions in one breath.

    The longest-candidate rule would otherwise return the glued pair, which
    matches no real institution. Keep the first name; the second one is still
    found as its own candidate by the same scan.
    """
    heads = list(_HEAD_POSITION_RE.finditer(candidate))
    if len(heads) < 2:
        return candidate
    between = candidate[heads[0].end(): heads[1].start()]
    connectors = list(re.finditer(r"\s*(?:[,;]|\band\b|\bor\b|&\s)", between, re.IGNORECASE))
    if not connectors:
        return candidate
    # The connector closest to the second institution is the one that splits them.
    return candidate[: heads[0].end() + connectors[-1].start()].strip(" ,;")


_MIDDLE_NAME_WORDS = {"of", "and", "the", "for", "upon", "de", "la", "le"}


def _titlecase_name(value: str) -> str:
    """The case-insensitive fallback regex can return a lowercase fragment.

    Re-casing it keeps the display name presentable ("university of manchester"
    -> "University of Manchester") without pretending to know the institution.
    """
    words = value.split()
    return " ".join(
        word if index and word.lower() in _MIDDLE_NAME_WORDS else word.capitalize()
        for index, word in enumerate(words)
    )


def find_university(text: str) -> str | None:
    """Longest institution-name candidate wins, so 'Technical' is not lost."""
    candidates: list[str] = []
    for regex in (_RE_UNIVERSITY, _RE_UNIVERSITY_LOOSE):
        for match in regex.finditer(text):
            raw = _clean(match.group(1))
            if raw and raw == raw.lower():
                raw = _titlecase_name(raw)
            candidate = _trim_second_institution(raw)
            if candidate and _is_plausible_institution(candidate):
                candidates.append(candidate)
    if not candidates:
        return None
    return max(candidates, key=len)


def find_country(text: str) -> str | None:
    lowered = text.lower()
    best: tuple[int, str] | None = None
    for token, canonical in COUNTRY_LOOKUP.items():
        match = re.search(r"(?<!\w)" + re.escape(token) + r"(?!\w)", lowered)
        if match and (best is None or match.start() < best[0]):
            best = (match.start(), canonical)
    return best[1] if best else None


def _normalize_degree_token(token: str) -> str:
    key = token.replace(".", "").upper()
    return {
        "MSC": "MSc", "MS": "MSc", "MPHIL": "MPhil", "MENG": "MEng", "MBA": "MBA",
        "BSC": "BSc", "BS": "BSc", "BBA": "BBA", "BENG": "BEng", "PHD": "PhD",
        "DOCTORATE": "PhD", "LLM": "LLM", "LLB": "LLB", "MA": "MA",
        "POSTGRADUATE": "Postgraduate", "UNDERGRADUATE": "Undergraduate",
        "BACHELOR": "Bachelor", "MASTER": "Master", "DIPLOMA": "Diploma",
        "FOUNDATION": "Foundation",
    }.get(key, token.title())


def find_program(text: str) -> str | None:
    """'MSc Computer Science', 'program in Data Science', etc."""
    for match in _RE_PROGRAM.finditer(text):
        rest = _clean(match.group(2), 120) or ""
        stop = _PROGRAM_STOP.search(rest)
        if stop:
            rest = rest[: stop.start()].strip()
        rest = re.sub(r"\s+(?:and|or|in)$", "", rest, flags=re.IGNORECASE)
        if rest and 1 <= len(rest.split()) <= 5 and rest.lower() not in {"study", "abroad", "apply"}:
            return f"{_normalize_degree_token(match.group(1))} {rest}"[:300]
    match = _RE_PROGRAM_LOOSE.search(text)
    if match:
        candidate = _clean(match.group(1), 120)
        if candidate and len(candidate.split()) <= 6:
            return candidate
    match = _RE_PROGRAM_AT.search(text)
    if match:
        candidate = _clean(match.group(1), 120)
        if candidate and len(candidate.split()) <= 6:
            return candidate
    return None


def find_agent(text: str) -> str | None:
    """Consultant/agency name, only from explicit name-shaped evidence."""
    candidates: list[str] = []
    for regex in (_RE_AGENT_IS, _RE_AGENT_NAME, _RE_AGENT_VIA):
        for match in regex.finditer(text):
            candidate = _clean(match.group(1), 300)
            if not candidate or len(candidate) < 5:
                continue
            words = candidate.split()
            if len(words) > 6:
                continue
            if all(word.lower().strip(".,'") in _AGENT_STOPWORDS for word in words):
                continue
            if not words[0][:1].isupper():
                continue
            candidates.append(candidate)
    if not candidates:
        return None
    # Prefer a fuller name ("ABC Education Consultants" over "ABC Education").
    return max(candidates, key=len)


def _to_number(raw: str) -> float | None:
    digits = re.sub(r"[^\d.]", "", raw or "")
    if not digits:
        return None
    # South Asian lakh grouping ("2,50,000") keeps its digits; strip extra dots.
    parts = digits.split(".")
    if len(parts) > 2:
        digits = parts[0] + "".join(parts[1:])
    try:
        return float(digits)
    except ValueError:
        return None


def find_amount(text: str) -> float | None:
    lowered = (text or "").lower().replace(",", "")

    for match in _RE_LAKH.finditer(lowered):
        value = _to_number(match.group(1))
        if value:
            return round(value * (100_000 if match.group(2).startswith("lakh") else 10_000_000), 2)

    for regex in (_RE_AMOUNT_PREFIX, _RE_AMOUNT_SUFFIX, _RE_AMOUNT_LEADING_CURRENCY):
        for match in regex.finditer(lowered):
            first, second = match.group(1), (match.group(2) or "")
            # "GBP 2500" puts the currency first; swap so parsing stays uniform.
            if regex is _RE_AMOUNT_LEADING_CURRENCY:
                raw, unit = second, first
            else:
                raw, unit = first, second
            value = _to_number(raw)
            if not value:
                continue
            if unit.startswith("lakh"):
                value *= 100_000
            elif unit.startswith("crore"):
                value *= 10_000_000
            # Ignore dates, percentages and small counts masquerading as amounts.
            if value < 500 or re.fullmatch(r"(?:19|20)\d{2}\.?\d*", raw or ""):
                continue
            return round(value, 2)
    return None


def find_currency(text: str) -> str | None:
    lowered = text.lower()
    for symbol, code in CURRENCY_SYMBOLS.items():
        if symbol in text:
            return code
    for token, code in CURRENCY_TOKENS.items():
        if re.search(r"(?<!\w)" + re.escape(token) + r"(?!\w)", lowered):
            return code
    if re.search(r"(?<!\w)lakhs?(?!\w)|(?<!\w)crores?(?!\w)", lowered):
        return "PKR"
    return None


def find_payment_method(text: str) -> str | None:
    lowered = text.lower()
    for phrase in RISKY_METHODS + OFFICIAL_METHODS:
        if phrase in lowered:
            return phrase.title()
    match = re.search(r"(?:payment|pay)\s+(?:method|mode|via|through|by)\s*[:\-]?\s*([A-Za-z ]{3,40})", lowered)
    if match:
        return _clean(match.group(1), 300)
    return None


def find_payment_purpose(text: str) -> str | None:
    lowered = text.lower()
    for phrase in SUSPICIOUS_PURPOSES:
        if phrase in lowered:
            return phrase
    match = re.search(r"\b(?:for|of|as)\s+(?:a\s+|an\s+|the\s+)?([a-z ]{3,28}?fee)\b", lowered)
    if match:
        return _clean(match.group(1), 500)
    return None


def find_degree_level(text: str) -> str | None:
    match = _RE_DEGREE_LEVEL.search(text)
    if not match:
        return None
    return {
        "BSC": "BS", "BS": "BS", "BBA": "BS", "BENG": "BS", "UNDERGRADUATE": "BS",
        "BACHELOR": "BS", "MSC": "MS", "MS": "MS", "MA": "MS", "MBA": "MS",
        "MENG": "MS", "MPHIL": "MS", "POSTGRADUATE": "MS", "MASTER": "MS",
        "PHD": "PhD", "DOCTORATE": "PhD",
    }.get(match.group(1).replace(".", "").upper(), "MS")


def find_funding_type(text: str) -> str | None:
    lowered = text.lower()
    if "fully funded" in lowered or "full scholarship" in lowered or "full funding" in lowered:
        return "fully_funded"
    if "partially funded" in lowered or "partial scholarship" in lowered or "partial funding" in lowered:
        return "partially_funded"
    if re.search(r"self[\s-]?(?:funded|sponsor)", lowered):
        return "self_funded"
    if _RE_SCHOLARSHIP_NAME.search(text):
        return "external_scholarship"
    if _RE_SCHOLARSHIP_MENTION.search(lowered):
        return "unsure"
    return None


def find_scholarship(text: str) -> str | None:
    match = _RE_SCHOLARSHIP_NAME.search(text)
    if match:
        return _clean(match.group(1), 300)
    match = re.search(
        r"([A-Z][A-Za-z0-9'\-\.\& ]{2,40}?)\s*(?:scholarship|grant|funding)\b", text
    )
    if match:
        candidate = _clean(match.group(1), 300)
        if candidate and candidate.lower() not in {"the", "a", "no", "full", "my", "this"}:
            return f"{candidate} Scholarship"[:300]
    return None


def find_deadline(text: str) -> str | None:
    match = _RE_DEADLINE.search(text)
    return _clean(match.group(1), 200) if match else None


def find_intake(text: str) -> str | None:
    match = _RE_INTAKE.search(text)
    return _clean(match.group(2), 200) if match else None


def find_claims(text: str) -> list[str]:
    """Sentences containing a promise/guarantee/pressure marker, kept verbatim."""
    claims: list[str] = []
    for sentence in _RE_SENTENCE_SPLIT.split(text or ""):
        stripped = sentence.strip()
        if len(stripped) < 8 or len(stripped) > 300:
            continue
        lowered = stripped.lower()
        if any(marker in lowered for marker in CLAIM_MARKERS):
            claims.append(stripped)
        if len(claims) >= 12:
            break
    return claims


def extract_facts(text: str) -> dict:
    """One structured read of a piece of student or evidence text."""
    text = text or ""
    amount = find_amount(text)
    facts_out = {
        "university": find_university(text),
        "country": find_country(text),
        "program": find_program(text),
        "agent": find_agent(text),
        "scholarship": find_scholarship(text),
        "degree_level": find_degree_level(text),
        "funding_type": find_funding_type(text),
        "payment_amount": amount,
        "currency": find_currency(text),
        "payment_method": find_payment_method(text),
        "payment_purpose": find_payment_purpose(text),
        "payment_deadline": find_deadline(text),
        "intake": find_intake(text),
        "claims": find_claims(text),
        "urls": sorted({
            match.group(1).lower()
            for match in (re.search(r"https?://(?:www\.)?([^/]+)", url) for url in _RE_URL.findall(text))
            if match
        })[:10],
        "emails": sorted(set(_RE_EMAIL.findall(text)))[:5],
        "official_email_domain": (
            _RE_UNIVERSITY_EMAIL_DOMAIN.search(text).group(1).lower()
            if _RE_UNIVERSITY_EMAIL_DOMAIN.search(text) else None
        ),
    }
    if facts_out["payment_amount"] and not facts_out["currency"]:
        facts_out["currency"] = "PKR"
    return facts_out


# Backwards-compatible alias for callers written against the earlier name.
def find_official_domains(text: str) -> list[str]:
    return extract_facts(text)["urls"]
