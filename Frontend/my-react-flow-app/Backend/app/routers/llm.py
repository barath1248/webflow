from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.services.gemini_client import gemini_chat
import requests
import os

router = APIRouter()

class GenerateBody(BaseModel):
	query: str
	context: list | None = None
	prompt: str | None = "You are a helpful assistant. Answer clearly."
	model: str | None = "gemini-1.5-flash"
	# Optional web flag/params could be added later for SerpAPI/Brave

@router.post("/generate")
async def generate(request: Request):
	# Parse body defensively: prefer JSON, fallback to form, then raw text
	raw = None
	try:
		raw = await request.json()
	except Exception:
		# Not JSON; try form
		try:
			form = await request.form()
			raw = dict(form) if form else {}
		except Exception:
			# As a last resort, accept plain text body and treat it as the query
			try:
				body_bytes = await request.body()
				text_body = (body_bytes or b"").decode(errors="ignore").strip()
				if text_body:
					# If body looks like a JSON string (e.g. "hey"), strip quotes
					if (text_body.startswith('"') and text_body.endswith('"')) or (text_body.startswith("'") and text_body.endswith("'")):
						text_body = text_body[1:-1]
					raw = {"query": text_body}
				else:
					raw = {}
			except Exception:
				raw = {}

	# Debug logging (safe keys only)
	try:
		print("/api/llm/generate request:", {
			"has_json": isinstance(raw, dict),
			"keys": list(raw.keys()) if isinstance(raw, dict) else [],
		})
	except Exception:
		pass
	if not isinstance(raw, dict):
		raw = {}

	# Accept common aliases for the user message
	query = (raw.get("query") or raw.get("text") or "").strip()
	context_input = raw.get("context") or []
	prompt = raw.get("prompt") or "You are a helpful assistant. Answer clearly."
	model_input = raw.get("model") or "gemini-1.5-flash"
	if not query:
		raise HTTPException(status_code=400, detail="Missing 'query' in request body")

	# Join a few context chunks for the prompt
	context_text = ""
	if context_input:
		parts = []
		for c in context_input[:8]:
			if isinstance(c, dict):
				parts.append(c.get("chunk") or c.get("text") or str(c))
			else:
				parts.append(str(c))
		context_text = "\n\n".join(parts)

	system = prompt or "You are a helpful assistant."
	user = f"User query: {query}\n\nContext (optional):\n{context_text}".strip()

	# Normalize model: if a non-Gemini model is provided, fall back to Gemini default
	model = model_input or "gemini-1.5-flash"
	if not model.lower().startswith("gemini"):
		model = "gemini-1.5-flash"

	try:
		text = gemini_chat(user, system=system, model=model)
		return {"text": text}
	except RuntimeError as config_err:
		# Common case: missing GEMINI_API_KEY
		msg = str(config_err)
		if "GEMINI_API_KEY" in msg:
			# Allow mock in dev to avoid blocking UI testing
			if os.getenv("DEV_MOCK_LLM", "1") in ("1", "true", "True"):
				mock = f"[DEV MOCK RESPONSE]\n\nPrompt: {system}\n\n{user[:600]}"
				return {"text": mock}
			raise HTTPException(status_code=400, detail="GEMINI_API_KEY is missing. Set it on the backend and retry.")
		raise HTTPException(status_code=400, detail=msg)
	except requests.HTTPError as http_err:  # type: ignore[attr-defined]
		status = getattr(http_err.response, "status_code", 502) if getattr(http_err, "response", None) else 502
		# Try to surface upstream error message for clarity
		upstream_msg = None
		try:
			if getattr(http_err, "response", None) is not None:
				ct = http_err.response.headers.get("content-type", "")
				if "application/json" in ct:
					data = http_err.response.json()
					upstream_msg = (
						data.get("error", {}).get("message")
						or data.get("message")
						or str(data)
					)
				else:
					upstream_msg = http_err.response.text[:500]
		except Exception:
			upstream_msg = None

		if os.getenv("DEV_MOCK_LLM", "1") in ("1", "true", "True"):
			mock = f"[DEV MOCK RESPONSE]\n\nPrompt: {system}\n\n{user[:600]}\n\n(Note: upstream HTTP error was mocked)"
			return {"text": mock}

		if int(status) == 402:
			hint = "Payment required or billing/quotas not enabled for the Gemini API. Enable billing and access to the requested model."
		elif int(status) in (401, 403):
			hint = "Unauthorized/forbidden. Check GEMINI_API_KEY and API access permissions."
		elif int(status) == 404:
			hint = "Model not found. Use a valid Gemini model (e.g., 'gemini-1.5-pro')."
		else:
			hint = "Upstream LLM error."

		detail = f"{hint} ({status}). {upstream_msg or ''}".strip()
		raise HTTPException(status_code=int(status), detail=detail)
	except requests.RequestException as net_err:  # type: ignore[attr-defined]
		# Network/timeout/DNS issues to upstream provider
		# Dev fallback
		if os.getenv("DEV_MOCK_LLM", "1") in ("1", "true", "True"):
			mock = f"[DEV MOCK RESPONSE]\n\nPrompt: {system}\n\n{user[:600]}\n\n(Note: network error was mocked)"
			return {"text": mock}
		raise HTTPException(status_code=502, detail=f"LLM network error: {str(net_err)}")
	except Exception as exc:
		# Log unexpected errors for troubleshooting
		try:
			print("/api/llm/generate error:", str(exc))
		except Exception:
			pass
		# Dev fallback on any unexpected error
		if os.getenv("DEV_MOCK_LLM", "1") in ("1", "true", "True"):
			mock = f"[DEV MOCK RESPONSE]\n\nPrompt: {system}\n\n{user[:600]}\n\n(Note: error was mocked)"
			return {"text": mock}
		# Avoid leaking internals; provide actionable message for frontend
		raise HTTPException(status_code=500, detail=str(exc))
