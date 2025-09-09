import React, { useState, useRef, useEffect } from "react";

/**
 * MinimalUserQueryComponent (JavaScript)
 * -------------------------------------
 * Ultra‑simple entry widget: A single textarea that sends on Enter.
 * - Shift+Enter inserts a newline
 * - No tags, buttons, or history
 * - Lightweight inline styles (no Tailwind required)
 *
 * Props:
 * - placeholder?: string
 * - autoFocus?: boolean
 * - onSend: (payload: { text: string }) => void|Promise<void>
 * - className?: string
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
    try {
      setBusy(true);
      await onSend?.({ text: value });
      setText("");
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className={className}
      style={{
        width: "100%",
        maxWidth: 640,
        border: "none",
        borderRadius: 12,
        background: "transparent",
        padding: 12,
      }}
    >
      <div style={{ fontWeight: 600, color: "#fff", marginBottom: 8 }}>User Query</div>
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Enter your query"
        disabled={busy}
        style={{
          width: "100%",
          height: 140,
          color: "#eaeaea",
          background: "#0f0f0f",
          border: "1px solid #2a2a2a",
          borderRadius: 10,
          padding: "10px 12px",
          lineHeight: 1.5,
          resize: "vertical",
          outline: "none",
        }}
      />
      {/* Hidden, but kept for a11y: Enter to send */}
      <span style={{ display: "block", fontSize: 12, color: "#888", marginTop: 6 }}>
        Press <b>Enter</b> to send · <b>Shift+Enter</b> for newline
      </span>
    </div>
  );
}
