"""Load static HEC and banned-agent reference datasets safely."""
import json
import logging
from difflib import SequenceMatcher
from pathlib import Path

logger = logging.getLogger(__name__)
DATA_DIR = Path(__file__).parent


def _load_json(filename: str) -> dict:
    with open(DATA_DIR / filename, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"{filename} must contain a JSON object")
    return data


_hec_data = _load_json("hec_recognized.json")
_banned_agents_data = _load_json("banned_agents.json")

if not isinstance(_hec_data.get("institutions", []), list):
    raise ValueError("hec_recognized.json: institutions must be a list")
if not isinstance(_banned_agents_data.get("agents", []), list):
    raise ValueError("banned_agents.json: agents must be a list")
for index, inst in enumerate(_hec_data.get("institutions", [])):
    if not isinstance(inst, dict) or not isinstance(inst.get("name"), str) or not inst["name"].strip():
        raise ValueError(f"hec_recognized.json: institutions[{index}] requires a non-empty name")
for index, agent in enumerate(_banned_agents_data.get("agents", [])):
    if not isinstance(agent, dict) or not isinstance(agent.get("agent_name"), str) or not agent["agent_name"].strip():
        raise ValueError(f"banned_agents.json: agents[{index}] requires a non-empty agent_name")
if not _hec_data.get("institutions"):
    logger.warning("HEC reference dataset is empty; no HEC match can be asserted")
if not _banned_agents_data.get("agents"):
    logger.warning("Banned-agent reference dataset is empty; no banned-agent match can be asserted")


def _similar(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def lookup_hec_institution(name: str, threshold: float = 0.75) -> dict | None:
    best_match, best_score = None, 0.0
    for inst in _hec_data.get("institutions", []):
        score = _similar(name, inst["name"])
        if score > best_score:
            best_match, best_score = inst, score
    return {**best_match, "match_confidence": round(best_score, 2)} if best_match and best_score >= threshold else None


def lookup_banned_agent(name: str, threshold: float = 0.75) -> dict | None:
    best_match, best_score = None, 0.0
    for agent in _banned_agents_data.get("agents", []):
        score = _similar(name, agent["agent_name"])
        if score > best_score:
            best_match, best_score = agent, score
    return {**best_match, "match_confidence": round(best_score, 2)} if best_match and best_score >= threshold else None
