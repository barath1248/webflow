def chunk_text(text: str, max_len: int = 1000, overlap: int = 100) -> list[str]:
    text = " ".join(text.split())
    if not text:
        return []
    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(n, start + max_len)
        chunks.append(text[start:end])
        if end == n:
            break
        start = max(0, end - overlap)
    return [c for c in chunks if c.strip()]
