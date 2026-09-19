# Network Security Compliance

To run the project you have to follow some steps

**AI-assisted configuration analysis, compliance reporting, and Cisco-to-Junos translation.**

Analyze network configurations against CIS and NIST rules, translate vendor syntax with a RAG pipeline, and improve future results with human-verified mappings.

Apply the migrations

</div>

Run the Django server (ai_engine + compliance, port 8000)

## What This Does

and now test the upload

```curl.exe -X POST "http://127.0.0.1:8000/api/uploads/" -F "config=@sample_config.txt" -F "vendor=cisco"```
or
```curl -X POST "http://127.0.0.1:8000/api/uploads/" -F "config=@sample_config.txt" -F "vendor=cisco"```

and you will get the response

```python view_report.py (id of the response)```

---

# RAG (Cisco -> Juniper translation) with normalized output

The `rag/` folder is a standalone FastAPI service (port 8001) that:

- asks for the source vendor and target vendor first (`GET /api/vendors`)
- translates Cisco config into Junos `set` commands (deterministic pipeline +
  RAG evidence + Ollama fallback)
- writes the full RAG response to `rag\normalised_{target}.json`
- writes a copy to `ai_engine\normalised_{target}.json`
- writes the schema baseline (ai_engine format) to
  `ai_engine\normalised_{target}_baseline.json`
- hands the translated config to Django's upload pipeline, so ai_engine LLM
  normalizes it, validates it, and runs the compliance engine

## 1. Start the RAG API

```python rag/main.py        # from inside rag/
```

## 2. Check everything is working

```python workflow.py --check
```

This checks RAG API, Django, Ollama and Postgres/pgvector and prints the
vector store chunk count.

## 3. Run the whole workflow (one command)

```python workflow.py --config D:\Security_Compilence\sample_config.txt --source cisco --target junos
```

It uploads the config to the RAG, prints the Junos set commands + confidence +
unresolved lines, shows where the normalized files were saved, and calls the
ai_engine upload endpoint so the compliance report is generated.

Omit flags to be prompted interactively.


Interactive chatbot:

```python rag_chatbot.py        # from inside rag/
# paste a Cisco config block -> get Junos set commands
# ask a question -> retrieval + Ollama answer
# :help for commands, :quit to exit
```
