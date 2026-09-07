"""
core/views.py

Web entry points that replace the original script's main() + input() flow.
Synchronous for the prototype (no Celery).
"""

import json
from pathlib import Path

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import DeviceUpload, RemediationLog
from .serializers import DeviceUploadSerializer
from ai_engine.services.ollama_client import normalize_config, reinforcement_prompt
from ai_engine.services.validator import validate_normalized_json
from compliance.services.rule_engine import compliance_engine
from compliance.services.remediation import generate_remediation_commands, execute_remediation

BASE_DIR = Path(__file__).resolve().parent.parent

INSTRUCTIONS_PATH = BASE_DIR / "ai_engine" / "schemas" / "llm_instructions.json"
SCHEMA_PATH = BASE_DIR / "ai_engine" / "schemas" / "normalized_schema.json"
RULES_PATH = BASE_DIR / "compliance" / "data" / "cis_rules.json"


def _load_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@api_view(["POST"])
def upload_config(request):
    """
    POST /api/uploads/
    Accepts a raw config file (multipart), runs it through:
    normalize -> validate -> (reinforce if needed) -> compliance check.
    """
    file_obj = request.FILES.get("config")
    vendor = request.data.get("vendor", "cisco")

    if not file_obj:
        return Response({"error": "No config file provided."}, status=status.HTTP_400_BAD_REQUEST)

    config_text = file_obj.read().decode("utf-8", errors="ignore")
    if len(config_text.strip()) < 10:
        return Response({"error": "Config file is empty or too short."}, status=status.HTTP_400_BAD_REQUEST)

    instructions = _load_json(INSTRUCTIONS_PATH)
    schema = _load_json(SCHEMA_PATH)
    rules = _load_json(RULES_PATH)

    upload = DeviceUpload.objects.create(vendor=vendor, status="processing")

    try:
        normalized_data = normalize_config(config_text, instructions, schema)
    except Exception as e:
        upload.status = "failed"
        upload.save()
        return Response({"error": f"Normalization failed: {e}"}, status=500)

    is_valid, errors = validate_normalized_json(normalized_data, schema)
    retry_count = 0
    max_retries = 2
    while not is_valid and retry_count < max_retries:
        try:
            normalized_data = reinforcement_prompt(config_text, errors, instructions, schema)
        except Exception:
            break
        is_valid, errors = validate_normalized_json(normalized_data, schema)
        retry_count += 1

    if not is_valid:
        upload.status = "review"
        upload.baseline_json = normalized_data
        upload.save()
        return Response({
            "id": upload.id,
            "status": "review",
            "errors": errors,
            "partial_baseline": normalized_data,
        }, status=status.HTTP_200_OK)

    report = compliance_engine(normalized_data, rules)

    upload.baseline_json = normalized_data
    upload.compliance_report = report
    upload.status = "done"
    upload.save()

    return Response(DeviceUploadSerializer(upload).data, status=status.HTTP_200_OK)


@api_view(["GET"])
def get_upload(request, upload_id):
    """GET /api/uploads/<id>/"""
    try:
        upload = DeviceUpload.objects.get(id=upload_id)
    except DeviceUpload.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    return Response(DeviceUploadSerializer(upload).data)


@api_view(["POST"])
def propose_remediation(request, upload_id):
    """
    POST /api/uploads/<id>/remediation/propose/
    Generates candidate fix commands for failed rules. Does NOT execute
    anything on any device.
    """
    try:
        upload = DeviceUpload.objects.get(id=upload_id)
    except DeviceUpload.DoesNotExist:
        return Response({"error": "Not found."}, status=404)

    if not upload.compliance_report:
        return Response({"error": "No compliance report available for this upload."}, status=400)

    instructions = _load_json(INSTRUCTIONS_PATH)
    failed_rules = [r for r in upload.compliance_report["results"] if r["status"] == "Fail"]

    proposals = generate_remediation_commands(upload.baseline_json, failed_rules, instructions)
    return Response({"upload_id": upload.id, "proposals": proposals})


@api_view(["POST"])
def execute_remediation_view(request, upload_id):
    """
    POST /api/uploads/<id>/remediation/execute/
    ⚠️ THIS PUSHES CONFIG TO A LIVE DEVICE.

    Requires "commands": [...] and "confirm": true in the request body.
    """
    if not request.data.get("confirm"):
        return Response(
            {"error": "Refusing to execute without explicit confirm=true."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    commands = request.data.get("commands")
    if not commands:
        return Response({"error": "No commands provided."}, status=400)

    try:
        upload = DeviceUpload.objects.get(id=upload_id)
    except DeviceUpload.DoesNotExist:
        return Response({"error": "Not found."}, status=404)

    # Wire an actual live `connection` object here (see core/services/device_fetch.py)
    connection = request.data.get("_connection_placeholder")
    if connection is None:
        return Response(
            {"error": "Device connection not wired up yet — see core/services/device_fetch.py."},
            status=501,
        )

    result = execute_remediation(connection, commands, delay_seconds=5)

    RemediationLog.objects.create(
        upload=upload,
        executed_by=request.user if request.user.is_authenticated else None,
        commands=commands,
        result=result,
    )

    return Response(result)
