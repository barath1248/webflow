// ============================
// MinimalUserQueryComponent.jsx
// ============================
import React, { useState, useRef, useEffect } from "react";

/**
 * MinimalUserQueryComponent — ultra‑simple text input that emits on Enter.
 * - Shift+Enter inserts a newline
 * - No extra buttons or styling dependencies
 * - Calls onSend({ text }) when user presses Enter
 */
export default function MinimalUserQueryComponent({
  placeholder = "Describe your request… (Shift+Enter for newline)",
  autoFocus = true,
  onSend,
  className = "",
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const taRef = useRef(null);

  useEffect(() => { if (autoFocus) taRef.current?.focus(); }, [autoFocus]);

  const submit = async () => {
    const value = text.trim();
    if (!value || busy) return;
    try { setBusy(true); await onSend?.({ text: value }); setText(""); }
    finally { setBusy(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <div className={className} style={cardStyle}>
      <div style={titleStyle}>User Query</div>
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Enter your query"
        disabled={busy}
        style={textareaStyle}
      />
      <span style={{ display: "block", fontSize: 12, color: "#888", marginTop: 6 }}>
        Press <b>Enter</b> to send · <b>Shift+Enter</b> for newline
      </span>
    </div>
  );
}

// ============================
// KnowledgeBaseComponent.jsx
// ============================
/**
 * KnowledgeBaseComponent — uploads PDFs, triggers retrieval for a query.
 * Props:
 * - incomingQuery: string
 * - autoRetrieve?: boolean (default true)
 * - onMatches?: function(matches) — optional callback to bubble matches to parent
 */
export function KnowledgeBaseComponent({ incomingQuery, autoRetrieve = true, onMatches, className = "" }) {
  const [files, setFiles] = useState([]); // {fileId, name, status}
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState([]); // retrieved context chunks
  const [message, setMessage] = useState("");
  const [topK, setTopK] = useState(5);

  useEffect(() => { if (incomingQuery && autoRetrieve) doRetrieve(incomingQuery); }, [incomingQuery, autoRetrieve]);

  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    for (const file of selected) {
      const idLocal = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setFiles((f) => [{ fileId: idLocal, name: file.name, status: "uploading" }, ...f]);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/kb/ingest", { method: "POST", body: form });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        const data = await res.json(); // { fileId, name }
        setFiles((f) => f.map((x) => x.fileId === idLocal ? { ...x, ...data, status: "ready" } : x));
      } catch (err) {
        setFiles((f) => f.map((x) => x.fileId === idLocal ? { ...x, status: "error" } : x));
        setMessage(String(err));
      }
    }
    e.target.value = ""; // allow same file re-select
  };

  const doRetrieve = async (query) => {
    if (!query) return;
    try {
      setBusy(true); setMessage("Searching knowledge base…");
      const res = await fetch("/api/kb/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, topK }),
      });
      if (!res.ok) throw new Error(`Retrieve failed (${res.status})`);
      const data = await res.json(); // { matches: [{id, score, chunk, meta}] }
      const next = Array.isArray(data.matches) ? data.matches : [];
      setMatches(next);
      onMatches?.(next);
      setMessage("");
    } catch (err) { setMessage(String(err)); } finally { setBusy(false); }
  };

  return (
    <div className={className} style={cardStyle}>
      <div style={titleStyle}>Knowledge Base</div>
      <div style={{ marginBottom: 12 }}>
        <input type="file" accept=".pdf" multiple onChange={handleUpload} />
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>Upload PDFs → backend extracts text, embeds, and stores in vector DB.</div>
      </div>
      {files.length > 0 && (
        <div style={listBoxStyle}>
          {files.map((f) => (
            <div key={f.fileId} style={rowStyle}>
              <span title={f.name} style={{ color: "#ddd" }}>{f.name}</span>
              <span style={{ fontSize: 12, color: statusColor(f.status) }}>{f.status || "ready"}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "#bbb" }}>Incoming query:</div>
        <div style={{ flex: 1, minWidth: 0, color: "#eaeaea", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={incomingQuery || "—"}>{incomingQuery || "—"}</div>
        <input type="number" min={1} max={20} value={topK} onChange={(e) => setTopK(Number(e.target.value) || 5)} style={numStyle} title="Top-K results" />
        <button onClick={() => doRetrieve(incomingQuery)} disabled={!incomingQuery || busy} style={buttonStyle}>{busy ? "Retrieving…" : "Retrieve"}</button>
      </div>
      <div style={{ marginTop: 12 }}>
        {message && <div style={{ color: "#ffb4b4", fontSize: 12, marginBottom: 8 }}>{message}</div>}
        {matches.length > 0 ? (
          <div style={listBoxStyle}>
            {matches.map((m, i) => (
              <div key={m.id || i} style={{ ...rowStyle, alignItems: "flex-start" }}>
                <div style={{ fontSize: 12, color: "#8ae99b", minWidth: 56 }}>score: {m.score?.toFixed?.(3) ?? m.score}</div>
                <div style={{ color: "#ddd", whiteSpace: "pre-wrap" }}>{m.chunk || m.text}</div>
              </div>
            ))}
          </div>
        ) : (<div style={{ fontSize: 12, color: "#888" }}>No results yet.</div>)}
      </div>
      <div style={{ fontSize: 12, color: "#888", marginTop: 10 }}>(Optional) Pass these results as context to your LLM engine.</div>
    </div>
  );
}

// ============================
// LLMEngineComponent.jsx (single, de-duplicated)
// ============================
/**
 * LLMEngineComponent — accepts query, optional context & prompt; calls backend.
 * Props:
 * - query: string (required)
 * - context?: array (strings or {chunk,text})
 * - defaultPrompt?: string
 * - provider?: "openai" | "gemini"
 * - enableWeb?: boolean — if true, backend may use SerpAPI/web
 * - onResponse?: function(text)
 * - autoRun?: boolean — auto call when inputs change
 */
export function LLMEngineComponent({
  query = "",
  context = [],
  defaultPrompt = "You are a helpful assistant. Answer clearly.",
  provider = "openai",
  enableWeb = false,
  className = "",
  onResponse,
  autoRun = false,
  renderInlineOutput = false,
}) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [model, setModel] = useState(provider === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini");
  const [web, setWeb] = useState(!!enableWeb);
  const [resp, setResp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (autoRun && query) generate(); }, [query, JSON.stringify(context), prompt, model, web]);

  const generate = async () => {
    if (!query || busy) return;
    setBusy(true); setErr(""); setResp("");
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const tryCall = async (payload) => {
      const res = await fetch("/api/llm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let reason = "";
        try { reason = await res.text(); } catch {}
        const error = new Error(`LLM call failed (${res.status}): ${reason}`);
        error.status = res.status;
        throw error;
      }
      return res.json();
    };

    try {
      const payload = { query, context, prompt, provider, model, web };
      let attempt = 0;
      let data;
      while (attempt < 3) {
        try {
          data = await tryCall(payload);
          break;
        } catch (err) {
          // Retry on transient upstream issues
          if (err.status === 429 || err.status === 502 || err.status === 503) {
            await sleep(500 * Math.pow(2, attempt));
            attempt++;
            continue;
          }
          throw err;
        }
      }
      if (!data) {
        // Model fallback once (flash <-> pro) then final try
        const alt = model === "gemini-1.5-flash" ? "gemini-1.5-pro" : "gemini-1.5-flash";
        try {
          const d2 = await tryCall({ ...payload, model: alt });
          data = d2;
          setModel(alt);
        } catch (err) {
          throw err;
        }
      }
      const text = (data && data.text) || "";
      setResp(text);
      onResponse?.(text);
    } catch (e) {
      setErr(String(e));
      onResponse?.(String(e));
    } finally {
      setBusy(false);
    }
  };

  // Preview a few context items (FIX: use "\n\n" instead of an unterminated string)
  const contextPreview = Array.isArray(context)
    ? context.slice(0, 5).map((c) => (typeof c === "string" ? c : (c.chunk || c.text || JSON.stringify(c)))).join("\n\n")
    : typeof context === "string" ? context : "";

  return (
    <div className={className} style={cardStyle}>
      <div style={titleStyle}>LLM Engine</div>

      {/* Inputs */}
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#bbb" }}>Model:</span>
          <select value={model} onChange={(e) => setModel(e.target.value)} style={selectStyle}>
            {provider === "gemini" ? (
              <>
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </>
            ) : (
              <>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4.1-mini">gpt-4.1-mini</option>
              </>
            )}
          </select>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#bbb" }}>
            <input type="checkbox" checked={web} onChange={(e) => setWeb(e.target.checked)} />
            Use web (SerpAPI)
          </label>
          <button onClick={generate} disabled={!query || busy} style={buttonStyle}>
            {busy ? "Generating…" : "Generate"}
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#bbb" }}>Query</div>
        <div style={pillBox} title={query || "—"}>{query || "—"}</div>

        <div style={{ fontSize: 12, color: "#bbb" }}>Custom Prompt (optional)</div>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={textareaStyle} />

        <div style={{ fontSize: 12, color: "#bbb" }}>Context (preview)</div>
        <div style={contextBox}>
          {contextPreview || "No context provided."}
        </div>
      </div>

      {(renderInlineOutput || err || resp) && (
        <div style={{ marginTop: 12 }}>
          {err && <div style={{ color: "#ffb4b4", fontSize: 12, marginBottom: 8 }}>{err}</div>}
          <div style={listBoxStyle}>
            <div style={{ ...rowStyle, alignItems: "flex-start" }}>
              <div style={{ color: "#ddd", whiteSpace: "pre-wrap" }}>{resp || "(No response yet)"}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: "#888", marginTop: 10 }}>
        Response is also emitted via <code>onResponse(text)</code> for your Output Component.
      </div>
    </div>
  );
}

// ============================
// Example wiring for three components (App.jsx)
// ============================
// import React, { useState } from "react";
// import MinimalUserQueryComponent from "./MinimalUserQueryComponent";
// import { KnowledgeBaseComponent } from "./KnowledgeBaseComponent";
// import { LLMEngineComponent } from "./LLMEngineComponent";
// export default function App() {
//   const [lastQuery, setLastQuery] = useState("");
//   const [kbMatches, setKbMatches] = useState([]);
//   const [llmText, setLlmText] = useState("");
//   return (
//     <div style={{ display: "grid", gap: 16 }}>
//       <MinimalUserQueryComponent onSend={({ text }) => setLastQuery(text)} />
//       <KnowledgeBaseComponent incomingQuery={lastQuery} autoRetrieve={true} onMatches={(m) => setKbMatches(m)} />
//       <LLMEngineComponent
//         query={lastQuery}
//         context={kbMatches}
//         provider="openai"
//         enableWeb={false}
//         onResponse={(text) => setLlmText(text)}
//       />
//     </div>
//   );
// }

// ============================
// Shared inline styles
// ============================
const cardStyle = { width: "100%", maxWidth: "min(100%, 720px)", border: "none", borderRadius: 12, background: "transparent", padding: 12 };
const titleStyle = { fontWeight: 600, color: "#fff", marginBottom: 8 };
const textareaStyle = { width: "100%", height: 140, color: "#eaeaea", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", lineHeight: 1.5, resize: "vertical", outline: "none" };
const selectStyle = { background: "#1a1a1a", color: "#eaeaea", border: "1px solid #2a2a2a", borderRadius: 8, padding: "6px 8px", fontSize: 12 };
const pillBox = { background: "#1a1a1a", color: "#eaeaea", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 12px", fontSize: 12, wordBreak: "break-word" };
const contextBox = { background: "#1a1a1a", color: "#eaeaea", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 12px", fontSize: 12, minHeight: "60px", maxHeight: "120px", overflow: "auto", wordBreak: "break-word" };
const listBoxStyle = { border: "1px solid #222", borderRadius: 10, background: "transparent", padding: 8, display: "grid", gap: 8 };
const rowStyle = { display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 10px", borderRadius: 8, background: "transparent", border: "1px solid #222" };
const buttonStyle = { background: "#6d28d9", color: "#fff", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer" };
const numStyle = { width: 56, background: "#1a1a1a", color: "#eaeaea", border: "1px solid #2a2a2a", borderRadius: 8, padding: "6px 8px", fontSize: 12 };
function statusColor(status) { switch (status) { case "uploading": return "#c8b26d"; case "ready": return "#8ae99b"; case "error": return "#ff8a8a"; default: return "#bbb"; } }

/* ============================
   MANUAL TEST CASES (for quick verification)
   1) MinimalUserQueryComponent: Type text, press Enter → onSend fires, textarea clears. Shift+Enter inserts newline.
   2) KnowledgeBaseComponent: Upload a PDF → status transitions uploading→ready. Set incomingQuery, click Retrieve → matches list renders (mock backend ok).
   3) LLMEngineComponent: With query present, click Generate → calls /api/llm/generate and renders response; toggle SerpAPI checkbox → payload.web toggles.
   4) Regression: No duplicate component names, and no unterminated string literals; context join uses "\\n\\n".
============================ */



  