import fitz  # PyMuPDF
from fastapi import UploadFile

async def extract_text_from_pdf(file: UploadFile) -> str:
    data = await file.read()
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as e:
        raise RuntimeError(f"Invalid or encrypted PDF: {str(e)}")
    try:
        parts = []
        for page in doc:
            try:
                parts.append(page.get_text("text") or "")
            except Exception:
                # Fallback to raw extraction if text layer missing
                parts.append(page.get_text() or "")
        return "\n".join(parts).strip()
    finally:
        try:
            doc.close()
        except Exception:
            pass
