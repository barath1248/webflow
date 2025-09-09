import React, { useEffect, useState } from "react";

export default function Sidebar() {
  const [recents, setRecents] = useState([]);

  useEffect(() => {
    let timer;
    const load = () => {
      fetch("/api/recents")
        .then(async (res) => {
          if (!res.ok) {
            let body = "";
            try { body = await res.text(); } catch {}
            console.error("/api/recents failed", res.status, body);
            return [];
          }
          return res.json();
        })
        .then((data) => setRecents(Array.isArray(data) ? data : []))
        .catch((e) => { console.error(e); setRecents([]); })
        .finally(() => { timer = setTimeout(load, 3000); });
    };
    load();
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  return (
    <div className="sidebar">
      <div className="components">
        <h3>Components</h3>
        <ul>
          <li> Input</li>
          <li> LLM (OpenAI)</li>
          <li> Knowledge Base</li>
          <li> Output</li>
        </ul>
      </div>
      <div className="recents">
        <h3>Recent</h3>
        {recents.length === 0 && <p className="muted">No history yet</p>}
        <ul>
          {recents.map((r) => (
            <li key={r.id}>{r.title}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
