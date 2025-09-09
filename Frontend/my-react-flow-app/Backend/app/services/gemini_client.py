import os, requests

CHAT_MODEL_DEFAULT = "gemini-1.5-pro"

def gemini_chat(user: str, system: str, model: str | None = None) -> str:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # <-- Move this here!
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY missing")
    model = model or CHAT_MODEL_DEFAULT
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
    # Simple system + user as one prompt
    prompt = f"{system}\n\n{user}"

    payload = {
        "contents": [
            { "parts": [ { "text": prompt } ] }
        ]
    }
    r = requests.post(url, json=payload, timeout=60)
    r.raise_for_status()
    data = r.json()

    # Current shape: candidates[0].content.parts[0].text
    return (data.get("candidates", [{}])[0]
               .get("content", {})
               .get("parts", [{}])[0]
               .get("text", "")) or ""