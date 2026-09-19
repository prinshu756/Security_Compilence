# Network Security Compliance

<div align="center">

**AI-assisted configuration analysis, compliance reporting, and Cisco-to-Junos translation.**

Analyze network configurations against CIS and NIST rules, translate vendor syntax with a RAG pipeline, and improve future results with human-verified mappings.

| Django API | RAG Translator | Frontend |
|:---:|:---:|:---:|
| `8000` | `8001` | `/frontend/` |

</div>

---

## What This Does

- **Configuration analysis** for Cisco IOS and Juniper Junos files
- **AI normalization** through a local Ollama model
- **Deterministic compliance checks** against CIS and NIST rules
- **CIS/NIST reports** with JSON output and PDF downloads
- **Cisco-to-Junos translation** using deterministic mappings, translation memory, RAG evidence, and LLM fallback
- **Human-in-the-loop learning** for uncertain mappings and corrections
- **Remediation suggestions** for failed compliance rules

> The application runs as two local services. Django handles uploads and compliance; FastAPI handles translation and RAG workflows.

## Architecture

```text
Browser
  |
  +--> Django API :8000
  |      Upload -> Normalize -> Validate -> Compliance -> Report
  |
  +--> FastAPI RAG API :8001
         Cisco config -> Memory -> Deterministic mapping -> RAG -> Ollama
                                      |
                                      +--> PostgreSQL + pgvector
```

### Translation memory

When a translation is uncertain, the result can be reviewed in the UI. A human correction stores:

- the original Cisco command
- an embedding for semantic similarity search
- the verified Junos command
- the human explanation
- confidence and source metadata

On later translations, memory is consulted before LLM fallback. A remembered target is reused directly; a remembered explanation is supplied as context when the model still needs to reason about a command.

## Requirements

- Windows 10/11
- Python 3.10 or newer
- PostgreSQL with the `vector`/pgvector extension
- Ollama
- A modern browser
- Git, if cloning the repository

## 1. Get the Code

```powershell
git clone https://github.com/prinshu756/Security_Compilence.git
cd Security_Compilence
```

If you already have the project, open PowerShell in the repository root, for example:

```text
D:\MachineLearning\Backend_copy\Backend_copy
```

## 2. Create the Python Environment

```powershell
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

Install the application dependencies:

```powershell
python -m pip install --upgrade pip
pip install django djangorestframework django-cors-headers python-decouple `
  psycopg2-binary pgvector reportlab requests fastapi uvicorn `
  python-multipart sentence-transformers sqlalchemy pypdf
```

The repository currently does not include a `requirements.txt`; the command above installs the dependencies used by the two services.

## 3. Prepare PostgreSQL

Create the two databases using `psql` or pgAdmin:

```sql
CREATE DATABASE "Security_Compliance";
CREATE DATABASE rag_chatbot;
```

Enable pgvector in the RAG database:

```sql
\c rag_chatbot
CREATE EXTENSION IF NOT EXISTS vector;
```

The default local connection settings are:

| Setting | Default |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| User | `postgres` |
| Django database | `Security_Compliance` |
| RAG database | `rag_chatbot` |

Update the credentials in `config/settings.py` and/or use the environment variables below before starting the services.

```powershell
$env:RAG_DB_HOST = "localhost"
$env:RAG_DB_PORT = "5432"
$env:RAG_DB_USER = "postgres"
$env:RAG_DB_PASSWORD = "your-password"
$env:RAG_DB_NAME = "rag_chatbot"
$env:AI_ENGINE_URL = "http://127.0.0.1:8000"
```

Apply Django migrations:

```powershell
python manage.py migrate
```

The RAG tables, including `chat_chunks`, `translator_mem`, and `translation_runs`, are created lazily when the RAG service first uses them.

## 4. Install and Start Ollama

Install Ollama from [ollama.com](https://ollama.com), then start it:

```powershell
ollama serve
```

In another PowerShell window, download the model configured by default:

```powershell
ollama pull hf.co/empero-ai/Qwen3.8-4B-Distill-GGUF:Q4_K_M
```

To use another model for the current session:

```powershell
$env:OLLAMA_URL = "http://localhost:11434"
$env:OLLAMA_MODEL = "qwen2.5:3b"
ollama pull qwen2.5:3b
```

Verify Ollama:

```powershell
ollama list
Invoke-WebRequest http://localhost:11434/api/tags
```

## 5. Start the Application

Use three PowerShell windows from the repository root.

### Window 1: Django compliance API

```powershell
.\.venv\Scripts\Activate.ps1
python manage.py runserver 8000
```

### Window 2: FastAPI RAG translator

```powershell
.\.venv\Scripts\Activate.ps1
cd rag
python main.py
```

The FastAPI interactive documentation is available at:

```text
http://127.0.0.1:8001/docs
```

### Window 3: Open the web interface

Open this URL in your browser:

```text
http://127.0.0.1:8000/
```

The root URL redirects to the frontend at `/frontend/`.

## 6. Confirm Everything Is Running

Run these checks from the repository root:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/
Invoke-WebRequest http://127.0.0.1:8001/
Invoke-WebRequest http://127.0.0.1:8001/api/health
```

Expected service locations:

| Service | URL | Purpose |
|---|---|---|
| Web app | `http://127.0.0.1:8000/` | Main interface |
| Django API | `http://127.0.0.1:8000/api/` | Uploads and compliance |
| Django admin | `http://127.0.0.1:8000/admin/` | Admin interface |
| FastAPI docs | `http://127.0.0.1:8001/docs` | Translation API tester |
| FastAPI health | `http://127.0.0.1:8001/api/health` | RAG/DB/Ollama status |
| Ollama | `http://localhost:11434` | Local LLM service |

## Use the Web Interface

### Analyze a configuration

1. Open `http://127.0.0.1:8000/`.
2. Choose **Cisco** or **Juniper**.
3. Select a configuration file.
4. Click **Analyze Configurations**.
5. Review the compliance results and download the PDF report.

Included samples:

- `sample_config.txt` - Cisco IOS example
- `sample_config_juniper.txt` - Juniper Junos example

### Translate Cisco to Junos

1. Open the **Translate Cisco to Juniper** panel.
2. Select a Cisco configuration.
3. Click **Translate & Analyze**.
4. Download the generated Junos configuration.
5. Review any **Human Review Needed** items.
6. Enter the correct Junos command and explanation, then click **Save Human Mapping**.

Saved corrections are reused on future matching or semantically similar commands.

## API Examples

### Analyze a Cisco file

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/uploads/" `
  -F "config=@sample_config.txt" `
  -F "vendor=cisco"
```

### Translate a configuration

```powershell
curl.exe -X POST "http://127.0.0.1:8001/api/translate/upload?source_vendor=cisco&target_vendor=junos" `
  -F "file=@sample_config.txt"
```

### Save a human-verified mapping

```powershell
$mapping = @{
  source_line = "ip ssh version 2"
  target = "set system services ssh protocol-version v2"
  mapping = "human_review"
  description = "Cisco SSH version 2 maps to the Junos SSH protocol version setting."
  confidence = 1.0
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8001/api/memory/feedback" `
  -Method Post `
  -ContentType "application/json" `
  -Body $mapping
```

### Download a PDF report

Replace `<upload-id>` with the ID returned by the upload endpoint:

```powershell
curl.exe -o report.pdf `
  "http://127.0.0.1:8000/api/uploads/report/pdf/?ids=<upload-id>"
```

## Optional: Index the Knowledge Base

Place supported reference documents in `rag/knowledge_base/`, then run:

```powershell
cd rag
python index.py --wipe
```

This rebuilds the pgvector-backed knowledge index used for retrieval and translation evidence.

## Run Tests and Checks

```powershell
python manage.py check
python manage.py test
```

For a direct syntax check of the RAG service:

```powershell
python -m py_compile rag\main.py rag\api\routes.py rag\translator\engine.py
```

## Project Layout

```text
.
├── ai_engine/              # LLM normalization and schema validation
├── compliance/             # CIS/NIST rules and remediation services
├── config/                 # Django settings, URLs, ASGI/WSGI
├── core/                   # Upload, report, and device API
├── frontend/               # Browser interface
├── rag/                    # FastAPI translator and RAG pipeline
│   ├── api/                # Translation, health, and feedback endpoints
│   ├── core/               # Embeddings, retrieval, indexing, storage
│   ├── translator/         # Cisco parser and Junos generator
│   └── knowledge_base/     # Reference documents and links
├── manage.py               # Django entry point
├── sample_config.txt       # Cisco sample configuration
└── sample_config_juniper.txt
```

## Troubleshooting

### Django shows `Page not found (404)` at `/`

Make sure you are using the current project and open:

```text
http://127.0.0.1:8000/
```

The root route redirects to `/frontend/`. A 404 at `/docs/` is expected on Django; FastAPI docs are on port `8001`:

```text
http://127.0.0.1:8001/docs
```

### Translation shows `Failed to fetch`

The FastAPI service is not reachable. Start it from the `rag` directory:

```powershell
cd rag
python main.py
```

Then check:

```powershell
Invoke-WebRequest http://127.0.0.1:8001/api/health
```

### `ModuleNotFoundError`

Activate the virtual environment and install dependencies again:

```powershell
.\.venv\Scripts\Activate.ps1
pip install django djangorestframework django-cors-headers python-decouple `
  psycopg2-binary pgvector reportlab requests fastapi uvicorn `
  python-multipart sentence-transformers sqlalchemy pypdf
```

### Database connection errors

Check PostgreSQL and confirm both databases exist. Also verify the password in `config/settings.py` and the `RAG_DB_*` environment variables.

### Ollama connection or model errors

```powershell
ollama serve
ollama list
ollama pull qwen2.5:3b
```

If using `qwen2.5:3b`, set `$env:OLLAMA_MODEL` before starting the RAG service.

## Security Notes

This configuration is for local development. Before deploying:

- move database passwords and Django secrets into environment variables
- set `DEBUG = False`
- restrict `ALLOWED_HOSTS`
- replace `CORS_ALLOW_ALL_ORIGINS = True` with explicit origins
- add authentication and authorization to sensitive endpoints
- review remediation execution carefully before enabling it in production

## License

See the repository license information for usage and distribution terms.
