"""Human-readable transcript line for a manual investigation-profile edit."""

FIELD_LABELS = {
    "country": "Country",
    "degree_level": "Degree level",
    "university": "University",
    "program": "Program",
    "scholarship": "Scholarship",
    "agent": "Consultant",
    "funding_type": "Funding",
    "payment_amount_pkr": "Payment amount (PKR)",
}


def summarize_context_change(changes: dict[str, tuple[object, object]]) -> str:
    """`changes` maps frontend field name -> (previous value, new value)."""
    if not changes:
        return "I reviewed the investigation profile and left it unchanged."
    lines = []
    for field, (previous, value) in changes.items():
        label = FIELD_LABELS.get(field, field.replace("_", " ").title())
        if value in (None, ""):
            lines.append(f"- {label}: cleared (was {previous})" if previous not in (None, "") else f"- {label}: cleared")
        elif previous in (None, ""):
            lines.append(f"- {label}: {value}")
        else:
            lines.append(f"- {label}: {value} (was {previous})")
    return "I updated my investigation profile:\n" + "\n".join(lines)
