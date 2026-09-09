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
JUNIPER_RULES_PATH = BASE_DIR / "compliance" / "data" / "cis_juniper_rules.json"


@api_view(["GET"])
def health(request):
    return Response({
        "status": "ok",
        "service": "ai_engine",
        "uploads_available": DeviceUpload.objects.exists(),
    })


def _rules_for_vendor(vendor: str):
    """Pick the CIS rules file matching the normalized config's vendor."""
    if (vendor or "").strip().lower() in ("junos", "juniper"):
        return _load_json(JUNIPER_RULES_PATH)
    return _load_json(RULES_PATH)


def _load_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


<<<<<<< Updated upstream
=======
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
    rules = _rules_for_vendor(vendor)
>>>>>>> Stashed changes

def _process_single_config(config_text, vendor, instructions, schema, rules):
    """Runs one config through normalize -> validate -> comply. Returns a dict result."""
    upload = DeviceUpload.objects.create(vendor=vendor, status="processing")

    try:
        normalized_data = normalize_config(config_text, instructions, schema)
    except Exception as e:
        upload.status = "failed"
        upload.save()
        return {"id": str(upload.id), "vendor": vendor, "status": "failed", "error": str(e)}

    is_valid, errors = validate_normalized_json(normalized_data, schema)
    retry_count = 0
    while not is_valid and retry_count < 2:
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
        return {"id": str(upload.id), "vendor": vendor, "status": "review", "errors": errors, "partial_baseline": normalized_data}

    report = compliance_engine(normalized_data, rules)
    upload.baseline_json = normalized_data
    upload.compliance_report = report
    upload.status = "done"
    upload.save()
    return DeviceUploadSerializer(upload).data


def generate_compliance_pdf(uploads):
    """Builds a single PDF covering one or more uploads (multi-device report)."""
    from io import BytesIO
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("Network Configuration Compliance Report", styles["Title"]))
    story.append(Paragraph(f"Devices covered: {len(uploads)}", styles["Normal"]))
    story.append(Spacer(1, 20))

    for upload in uploads:
        story.append(Paragraph(f"Device: {upload.baseline_json.get('hostname', 'Unknown')} ({upload.vendor})", styles["Heading1"]))
        story.append(Paragraph(f"Upload ID: {upload.id}", styles["Normal"]))
        story.append(Paragraph(f"Generated: {upload.created_at.strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]))
        story.append(Spacer(1, 12))

        summary = upload.compliance_report["summary"]
        summary_data = [
            ["Total", "Passed", "Failed", "Unknown", "Critical/High Fails"],
            [summary["total"], summary["passed"], summary["failed"], summary.get("unknown", 0), summary["critical_high"]],
        ]
        summary_table = Table(summary_data, hAlign="LEFT")
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#333333")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 14))

        status_colors = {"Pass": colors.green, "Fail": colors.red, "Unknown": colors.orange}
        for r in upload.compliance_report["results"]:
            color = status_colors.get(r["status"], colors.black)
            story.append(Paragraph(
                f'<b>[{r["rule_id"]}] {r["name"]}</b> — <font color="{color.hexval()[2:]}">{r["status"]}</font>',
                styles["Normal"]
            ))
            story.append(Paragraph(
                f'Field: {r["field"]} | Expected: {r["expected"]} | Actual: {r["actual"]} | Severity: {r["severity"]}',
                styles["Normal"]
            ))
            if r.get("reason"):
                story.append(Paragraph(f'<i>{r["reason"]}</i>', styles["Normal"]))
            story.append(Spacer(1, 8))

        story.append(PageBreak())  # next device starts on a new page

    doc.build(story)
    buffer.seek(0)
    return buffer

# @api_view(["POST"])
# def upload_config(request):
#     """
#     POST /api/uploads/
#     Accepts a raw config file (multipart), runs it through:
#     normalize -> validate -> (reinforce if needed) -> compliance check.
#     """
#     file_obj = request.FILES.get("config")
#     vendor = request.data.get("vendor", "cisco")

#     if not file_obj:
#         return Response({"error": "No config file provided."}, status=status.HTTP_400_BAD_REQUEST)

#     config_text = file_obj.read().decode("utf-8", errors="ignore")
#     if len(config_text.strip()) < 10:
#         return Response({"error": "Config file is empty or too short."}, status=status.HTTP_400_BAD_REQUEST)

#     instructions = _load_json(INSTRUCTIONS_PATH)
#     schema = _load_json(SCHEMA_PATH)
#     rules = _load_json(RULES_PATH)

#     upload = DeviceUpload.objects.create(vendor=vendor, status="processing")

#     try:
#         normalized_data = normalize_config(config_text, instructions, schema)
#     except Exception as e:
#         upload.status = "failed"
#         upload.save()
#         return Response({"error": f"Normalization failed: {e}"}, status=500)

#     is_valid, errors = validate_normalized_json(normalized_data, schema)
#     retry_count = 0
#     max_retries = 2
#     while not is_valid and retry_count < max_retries:
#         try:
#             normalized_data = reinforcement_prompt(config_text, errors, instructions, schema)
#         except Exception:
#             break
#         is_valid, errors = validate_normalized_json(normalized_data, schema)
#         retry_count += 1

#     if not is_valid:
#         upload.status = "review"
#         upload.baseline_json = normalized_data
#         upload.save()
#         return Response({
#             "id": upload.id,
#             "status": "review",
#             "errors": errors,
#             "partial_baseline": normalized_data,
#         }, status=status.HTTP_200_OK)

#     report = compliance_engine(normalized_data, rules)

#     upload.baseline_json = normalized_data
#     upload.compliance_report = report
#     upload.status = "done"
#     upload.save()

#     return Response(DeviceUploadSerializer(upload).data, status=status.HTTP_200_OK)

@api_view(["POST"])
def upload_config(request):
    """
    POST /api/uploads/
    Accepts ONE OR MORE config files (same field name "config", or
    "vendor" repeated per file). Each file is processed independently.
    """
    files = request.FILES.getlist("config")
    vendors = request.data.getlist("vendor")  # one vendor string per file, same order

    if not files:
        return Response({"error": "No config file(s) provided."}, status=status.HTTP_400_BAD_REQUEST)

    instructions = _load_json(INSTRUCTIONS_PATH)
    schema = _load_json(SCHEMA_PATH)
    rules = _load_json(RULES_PATH)

    results = []
    for i, file_obj in enumerate(files):
        vendor = vendors[i] if i < len(vendors) else "unknown"
        config_text = file_obj.read().decode("utf-8", errors="ignore")

        if len(config_text.strip()) < 10:
            results.append({"vendor": vendor, "status": "failed", "error": "Config file empty or too short."})
            continue

        result = _process_single_config(config_text, vendor, instructions, schema, rules)
        results.append(result)

    return Response({"count": len(results), "results": results}, status=status.HTTP_200_OK)


@api_view(["GET"])
def download_combined_report_pdf(request):
    """
    GET /api/uploads/report/pdf/?ids=<id1>,<id2>,...
    Generates ONE combined PDF covering multiple uploads (e.g. Cisco + Juniper).
    """
    ids_param = request.query_params.get("ids", "")
    upload_ids = [i.strip() for i in ids_param.split(",") if i.strip()]

    if not upload_ids:
        return Response({"error": "Provide ?ids=id1,id2,..."}, status=400)

    uploads = list(DeviceUpload.objects.filter(id__in=upload_ids))
    if not uploads:
        return Response({"error": "No matching uploads found."}, status=404)

    missing_report = [str(u.id) for u in uploads if not u.compliance_report]
    if missing_report:
        return Response({"error": f"These uploads have no compliance report yet: {missing_report}"}, status=400)

    buffer = generate_compliance_pdf(uploads)

    response = HttpResponse(buffer, content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="combined_compliance_report.pdf"'
    return response

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
