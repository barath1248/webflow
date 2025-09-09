// ============================
// MinimalUserQueryComponent.jsx
// ============================
import React, { useState, useRef, useEffect } from "react";

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
export function KnowledgeBaseComponent({ incomingQuery, autoRetrieve = true, className = "" }) {
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
        if (!res.ok) {
          const msg = await res.text();                 // 👈 capture backend detail
          console.error("KB ingest error:", res.status, msg);
          throw new Error(`Upload failed (${res.status}): ${msg}`);
        }
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
      setMatches(Array.isArray(data.matches) ? data.matches : []);
      setMessage("");
    } catch (err) {
      setMessage(String(err));
    } finally { setBusy(false); }
  };

  return (
    <div className={className} style={cardStyle}>
      <div style={titleStyle}>Knowledge Base</div>

      {/* Upload */}
      <div style={{ marginBottom: 12 }}>
        <input type="file" accept=".pdf" multiple onChange={handleUpload} />
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>
          Upload PDFs → backend extracts text, embeds, and stores in vector DB.
        </div>
      </div>

      {/* Files list */}
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

      {/* Query + Retrieve */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "#bbb" }}>Incoming query:</div>
        <div style={{ flex: 1, minWidth: 0, color: "#eaeaea", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={incomingQuery || "—"}>
          {incomingQuery || "—"}
        </div>
        <input type="number" min={1} max={20} value={topK} onChange={(e) => setTopK(Number(e.target.value) || 5)} style={numStyle} title="Top-K results" />
        <button onClick={() => doRetrieve(incomingQuery)} disabled={!incomingQuery || busy} style={buttonStyle}>
          {busy ? "Retrieving…" : "Retrieve"}
        </button>
      </div>

      {/* Results */}
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
        ) : (
          <div style={{ fontSize: 12, color: "#888" }}>No results yet.</div>
        )}
      </div>

      <div style={{ fontSize: 12, color: "#888", marginTop: 10 }}>
        (Optional) Pass these results as context to your LLM engine.
      </div>
    </div>
  );
}

// ============================
// Example wiring (App.jsx)
// ============================
// import MinimalUserQueryComponent from "./MinimalUserQueryComponent";
// import { KnowledgeBaseComponent } from "./KnowledgeBaseComponent";
// export default function App() {
//   const [lastQuery, setLastQuery] = useState("");
//   return (
//     <div style={{ display: "grid", gap: 16 }}>
//       <MinimalUserQueryComponent onSend={({ text }) => setLastQuery(text)} />
//       <KnowledgeBaseComponent incomingQuery={lastQuery} />
//     </div>
//   );
// }

// ============================
// Shared inline styles (copy into each file or central util)
// ============================
const cardStyle = { width: "100%", maxWidth: "min(100%, 720px)", border: "none", borderRadius: 12, background: "transparent", padding: 12 };
const titleStyle = { fontWeight: 600, color: "#fff", marginBottom: 8 };
const textareaStyle = { width: "100%", height: 140, color: "#eaeaea", background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", lineHeight: 1.5, resize: "vertical", outline: "none" };
const listBoxStyle = { border: "1px solid #222", borderRadius: 10, background: "transparent", padding: 8, display: "grid", gap: 8 };
const rowStyle = { display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 10px", borderRadius: 8, background: "transparent", border: "1px solid #222" };
const buttonStyle = { background: "#6d28d9", color: "#fff", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer" };
const numStyle = { width: 56, background: "#0f0f0f", color: "#eaeaea", border: "1px solid #2a2a2a", borderRadius: 8, padding: "6px 8px", fontSize: 12 };
function statusColor(status) { switch (status) { case "uploading": return "#c8b26d"; case "ready": return "#8ae99b"; case "error": return "#ff8a8a"; default: return "#bbb"; } }
