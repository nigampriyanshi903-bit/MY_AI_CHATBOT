import json
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

def create_vector_store(chunks_path="chunks.jsonl"):
    print(" Loading chunks from file:", chunks_path)

    texts = []
    with open(chunks_path, "r", encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            texts.append(obj["text"])

    print(f"📄 Total chunks loaded: {len(texts)}")

    if len(texts) == 0:
        print(" No chunks found — run load_docs.py first!")
        return

    print("⚡ Generating embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    print("🏗 Building FAISS vector database...")
    vectordb = FAISS.from_texts(texts, embeddings)

    print("💾 Saving vector store locally...")
    vectordb.save_local("vector_store")

    print(" Vector store created successfully!")
    print(" Saved folder: vector_store")

if __name__ == "__main__":
    create_vector_store()
