import os

# Try to use ChromaDB if available; otherwise fall back to an in-memory store
try:
	import chromadb  # type: ignore
	_CHROMA_AVAILABLE = True
except Exception:  # ImportError and any optional runtime linkage errors
	chromadb = None  # type: ignore
	_CHROMA_AVAILABLE = False


CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma")

# Lightweight in-memory store available regardless of Chroma presence
_memory_store = []

def _memory_add(chunks, embeddings=None, metadata=None):
	# If embeddings are missing or wrong length, create trivial embeddings
	num = len(chunks)
	if not embeddings or len(embeddings) != num:
		embeddings = [[0.0] for _ in range(num)]
	ids = []
	for i, (text, emb) in enumerate(zip(chunks, embeddings)):
		_doc_id = f"chunk-{len(_memory_store) + i}"
		ids.append(_doc_id)
		_memory_store.append((_doc_id, text, [float(v) for v in emb], metadata or {}))
	return ids

def _memory_query(query: str, k: int = 5):
	# Simple recency-based scoring
	results = []
	for idx, (doc_id, text, emb, meta) in enumerate(reversed(_memory_store)):
		score = 1.0 - (idx / max(1, len(_memory_store)))
		results.append({"id": doc_id, "score": float(score), "chunk": text, "meta": meta})
	return results[: max(1, k)]

if _CHROMA_AVAILABLE:
	try:
		_client = chromadb.PersistentClient(path=CHROMA_PATH)  # type: ignore[attr-defined]
		_collection = _client.get_or_create_collection("kb_store")

		def add_documents(chunks, embeddings=None, metadata=None):
			# If embeddings are missing, fall back to memory to avoid Chroma dimension constraints
			if embeddings is None:
				return _memory_add(chunks, embeddings=None, metadata=metadata)
			ids = [f"chunk-{i}" for i in range(len(chunks))]
			metas = [metadata or {} for _ in chunks]
			_collection.add(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metas)
			return ids

		def similarity_search(query: str, k: int = 5):
			try:
				res = _collection.query(query_texts=[query], n_results=k)
				docs = res.get("documents", [[]])[0]
				distances = res.get("distances", [[]])[0]
				metas = res.get("metadatas", [[]])[0]
				return [
					{"id": f"m-{i}", "score": float(distances[i]), "chunk": docs[i], "meta": metas[i]}
					for i in range(len(docs))
				]
			except Exception:
				return _memory_query(query, k)
	except Exception:
		# If Chroma initialization fails at runtime, fall back to memory store silently
		_CHROMA_AVAILABLE = False
else:
	# Minimal in-memory vector store. Good enough for local/dev when Chroma isn't installed.
	# Stores tuples of (id, text, embedding, metadata)
	def _cosine_similarity(vec_a, vec_b):
		# Avoid importing numpy; implement a basic cosine similarity
		if not vec_a or not vec_b or len(vec_a) != len(vec_b):
			return 0.0
		sum_xy = 0.0
		sum_x2 = 0.0
		sum_y2 = 0.0
		for x, y in zip(vec_a, vec_b):
			sum_xy += float(x) * float(y)
			sum_x2 += float(x) * float(x)
			sum_y2 += float(y) * float(y)
		if sum_x2 <= 0 or sum_y2 <= 0:
			return 0.0
		# cosine similarity in [0,1] if embeddings are non-negative; otherwise could be [-1,1]
		return sum_xy / ((sum_x2 ** 0.5) * (sum_y2 ** 0.5))

	def add_documents(chunks, embeddings=None, metadata=None):
		return _memory_add(chunks, embeddings, metadata)

	def similarity_search(query: str, k: int = 5):
		return _memory_query(query, k)
