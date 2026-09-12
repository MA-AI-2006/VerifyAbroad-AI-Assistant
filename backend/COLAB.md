# Google Colab quick start

From the extracted backend directory:

```python
!pip install -r requirements.txt
%cd /content/VerifyAbroad-AI-backend
```

Configure a private `.env` before starting the server. Then initialize the local development database/RAG seed as needed:

```python
!python -m rag.knowledge_base
!uvicorn main:app --host 0.0.0.0 --port 8000
```

API docs: `http://127.0.0.1:8000/docs`

For production Postgres, run Alembic instead of relying on `AUTO_CREATE_DB`:

```bash
alembic upgrade head
```
