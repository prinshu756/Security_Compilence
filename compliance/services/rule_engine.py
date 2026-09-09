"""
compliance/services/rule_engine.py

Deterministic rule evaluation — NO LLM calls in this file, by design.
This is what keeps Pass/Fail results audit-defensible: same input JSON +
same rule file always produces the same result.

IMPORTANT: a missing/None field is NEVER silently treated as a Pass or
Fail. It always becomes "Unknown", so a compliance report can never
claim something passed just because the LLM failed to extract it.
"""

# Operators where None/missing is a MEANINGFUL answer, not a missing
# extraction. "exists" and "non_empty" are explicitly testing for
# absence, so they're allowed to see None and reason about it directly.
OPERATORS_THAT_HANDLE_NONE = {"exists", "non_empty"}


def extract_value(data: dict, field_path: str):
    """Dotted-path extraction, e.g. 'management.ssh_version'."""
    parts = field_path.split(".")
    cur = data
    for p in parts:
        if isinstance(cur, dict) and p in cur:
            cur = cur[p]
        else:
            return None
    return cur


def evaluate_rule(rule: dict, norm_data: dict) -> dict:
    """Evaluates a single rule against normalized data."""
    field = rule["field"]
    actual = extract_value(norm_data, field)
    expected = rule["expected"]
    op = rule["operator"]

    # Guard: if the field wasn't extracted at all, and this operator
    # isn't designed to reason about absence, don't guess Pass/Fail.
    if actual is None and op not in OPERATORS_THAT_HANDLE_NONE:
        return {
            "rule_id": rule["id"],
            "framework": rule.get("framework", "CIS"),
            "name": rule["name"],
            "status": "Unknown",
            "actual": None,
            "expected": expected,
            "operator": op,
            "field": field,
            "severity": rule.get("severity", "Medium"),
            "level": rule.get("level"),
            "description": rule.get("description", ""),
            "reason": "Field not found in normalized data — needs human review, not auto Pass/Fail.",
        }

    if op == "eq":
        result = actual == expected
    elif op == "ge":
        result = actual >= expected
    elif op == "in":
        result = actual in expected
    elif op == "contains_any":
        if isinstance(actual, list):
            result = any(a in expected for a in actual)
        else:
            result = any(exp in str(actual) for exp in expected)
    elif op == "not_contains_any":
        if isinstance(actual, list):
            result = not any(a in expected for a in actual)
        else:
            result = not any(exp in str(actual) for exp in expected)
    elif op == "exists":
        result = actual is not None
    elif op == "non_empty":
        result = bool(actual) if actual is not None else False
    else:
        result = False

    status = "Pass" if result else "Fail"
    return {
        "rule_id": rule["id"],
        "framework": rule.get("framework", "CIS"),
        "name": rule["name"],
        "status": status,
        "actual": actual,
        "expected": expected,
        "operator": op,
        "field": field,
        "severity": rule.get("severity", "Medium"),
        "level": rule.get("level"),
        "description": rule.get("description", ""),
    }


def compliance_engine(normalized_data: dict, rules: list) -> dict:
    """Evaluates all rules and returns a summarized report."""
    results = [evaluate_rule(rule, normalized_data) for rule in rules]

    total = len(results)
    passed = sum(1 for r in results if r["status"] == "Pass")
    failed = sum(1 for r in results if r["status"] == "Fail")
    unknown = sum(1 for r in results if r["status"] == "Unknown")
    high_fails = sum(1 for r in results if r["status"] == "Fail" and r["severity"] == "High")

    return {
        "summary": {
            "total": total,
            "passed": passed,
            "failed": failed,
            "unknown": unknown,
            "critical_high": high_fails,
        },
        "results": results,
    }