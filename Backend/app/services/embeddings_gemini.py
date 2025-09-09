import os, requests
from typing import List

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EMBED_MODEL = "text-embedding-004"

def embed_texts_gemini(chunks: List[str]) -> list[list[float]]:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY missing")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBED_MODEL}:batchEmbedContents?key={GEMINI_API_KEY}"

    # Gemini expects: {"requests":[{"model":"text-embedding-004","content":{"parts":[{"text": "..."}]}} ...]}
    requests_payload = []
    for t in chunks:
        requests_payload.append({
            "model": EMBED_MODEL,
            "content": { "parts": [ { "text": t } ] }
        })

    r = requests.post(url, json={ "requests": requests_payload }, timeout=60)
    r.raise_for_status()
    data = r.json()  # { embeddings: [ { values: [...] }, ... ] }

    # Depending on API version, result may be under "embeddings" or "responses".
    # Current v1beta: { "embeddings": [ { "values": [...] }, ... ] }
    embeds = [e["values"] for e in data.get("embeddings", [])]
    if len(embeds) != len(chunks):
        # Fallback: older shape { "responses": [ { "embedding": { "values": [...] } } ] }
        resp_list = data.get("responses", [])
        if resp_list:
            embeds = [resp["embedding"]["values"] for resp in resp_list]

    return embeds
