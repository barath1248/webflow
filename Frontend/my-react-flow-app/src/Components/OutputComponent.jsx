import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * OutputChatComponent.jsx
 * --------------------------------------------------
 * A lightweight chat interface that displays the final response and
 * supports follow‑up questions. Follow‑ups re‑run your pipeline via
 * the provided `onAsk` handler, so you can keep the same logic as
 * your initial request (User → KB → LLM → Output).
 *
 * Props
 * -----
 * - onAsk: async (userText: string, history: ChatMessage[]) => Promise<LLMResult>
 *      You implement the pipeline inside onAsk. The component calls it on send.
 * - initialMessages?: ChatMessage[]
 * - placeholder?: string
 * - autoFocus?: boolean
 * - className?: string
 *
 * Types
 * -----
 * type Role = 'user' | 'assistant' | 'system';
 * type ChatMessage = { id?: string, role: Role, content: string, sources?: any[] };
 * type LLMResult = { text: string, sources?: any[] };
 *
 * Example wiring (parent):
 * ------------------------
 * <OutputChatComponent
 *   onAsk={async (text, history) => {
 *     // 1) Option A: call your MERN backend orchestrator
 *     const res = await fetch('/api/pipeline/run', {
 *       method: 'POST', headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ query: text, history })
 *     });
 *     const data = await res.json(); // { text, sources }
 *     return { text: data.text, sources: data.sources };
 *
 *     // 2) Option B: do it client-side (call /api/kb/retrieve then /api/llm/generate)
 *   }}
 * />
 */

export default function OutputChatComponent({
  onAsk,
  initialMessages = [],
  placeholder = "Ask a follow‑up…",
  autoFocus = true,
  className = "",
}) {
  const [messages, setMessages] = useState(() => normalizeMsgs(initialMessages));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);
  // Sync internal messages when parent updates initialMessages (e.g., LLM response appended)
  useEffect(() => { setMessages(normalizeMsgs(initialMessages)); }, [initialMessages]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;

    const userMsg = { role: 'user', content: q };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    try {
      setBusy(true);
      const res = await onAsk?.(q, [...messages, userMsg]);
      const botMsg = { role: 'assistant', content: res?.text || "", sources: res?.sources };
      setMessages((m) => [...m, botMsg]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'system', content: `Error: ${String(err)}` }]);
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={className} style={shellStyle}>
      <div style={headerStyle}>Assistant</div>

      <div ref={listRef} style={listStyle} className="oc-list">
        {messages.length === 0 && (
          <div style={emptyStyle}>No messages yet. Ask something to begin.</div>
        )}
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} sources={m.sources} />
        ))}
      </div>

      <div style={composerStyle}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={busy}
          style={inputStyle}
          aria-label="Type your message"
        />
        <button onClick={send} disabled={busy || !input.trim()} style={sendBtnStyle}>
          {busy ? '…' : 'Send'}
        </button>
      </div>

      <div style={hintStyle}>Enter to send · Shift+Enter for newline</div>
    </div>
  );
}

function ChatBubble({ role, content, sources }) {
  const isUser = role === 'user';
  const isSystem = role === 'system';
  const bubbleStyle = isSystem ? sysBubble : (isUser ? userBubble : botBubble);
  return (
    <div style={rowWrap}>
      <div style={avatar(isUser, isSystem)}>{isSystem ? '!' : (isUser ? 'U' : 'A')}</div>
      <div style={bubbleStyle}>
        <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
        {!!sources?.length && (
          <div style={srcWrap}>
            <div style={srcTitle}>sources</div>
            <ul style={srcList}>
              {sources.map((s, i) => (
                <li key={i} style={srcItem}>{renderSource(s)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function renderSource(s) {
  if (!s) return "";
  if (typeof s === 'string') return s;
  if (s.chunk) return s.chunk;
  if (s.text) return s.text;
  if (s.meta?.title) return `${s.meta.title}`;
  try { return JSON.stringify(s); } catch { return String(s); }
}

function normalizeMsgs(arr) {
  return Array.isArray(arr) ? arr.map((m) => ({ role: m.role || 'assistant', content: m.content || '' })) : [];
}

// ============================
// Styles (inline; consistent with your minimal components)
// ============================
const shellStyle = { width: '100%', maxWidth: 'min(100%, 960px)', border: 'none', borderRadius: 12, background: 'transparent', display: 'grid', gridTemplateRows: 'auto 1fr auto auto', gap: 8 };
const headerStyle = { padding: '6px 8px', color: '#fff', fontWeight: 600, borderBottom: 'none' };
const listStyle = { height: '50vh', overflow: 'auto', padding: '8px 10px', display: 'grid', gap: 10 };
const emptyStyle = { color: '#888', fontSize: 13 };
const composerStyle = { display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '8px 10px' };
const inputStyle = { minHeight: 52, maxHeight: 160, resize: 'vertical', background: '#0f0f0f', color: '#eaeaea', border: '1px solid #2a2a2a', borderRadius: 10, padding: '8px 10px', outline: 'none' };
const sendBtnStyle = { background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 10, padding: '0 16px', cursor: 'pointer' };
const hintStyle = { padding: '0 12px 12px', color: '#888', fontSize: 12 };

const rowWrap = { display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10 };
const avatar = (isUser, isSystem) => ({ width: 28, height: 28, borderRadius: 8, background: isSystem ? '#7c2d12' : (isUser ? '#1f2937' : '#201f3a'), color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 });
const userBubble = { background: '#1a1a1a', color: '#eaeaea', borderRadius: 12, padding: '10px 12px', border: '1px solid #2a2a2a' };
const botBubble = { background: '#151533', color: '#eaeaff', borderRadius: 12, padding: '10px 12px', border: '1px solid #25255a' };
const sysBubble = { background: '#3f1e25', color: '#ffd7de', borderRadius: 12, padding: '10px 12px', border: '1px solid #5b2530' };

const srcWrap = { marginTop: 8, borderTop: '1px dashed #333', paddingTop: 6 };
const srcTitle = { fontSize: 11, color: '#9aa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 };
const srcList = { margin: 0, paddingLeft: 18 };
const srcItem = { fontSize: 12, color: '#cbd5e1' };

/* ============================
   MANUAL TEST CASES
   1) With onAsk mocked to return a fixed string, sending a message should append
      a user bubble and an assistant bubble with that string.
   2) Shift+Enter inserts a newline; Enter sends.
   3) If onAsk throws, a red system bubble with the error appears.
   4) When assistant returns `sources`, they render under the bubble.
   5) List autoscrolls to the bottom on new messages.
============================ */
