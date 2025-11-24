import os
import json
from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    Docx2txtLoader,
    UnstructuredMarkdownLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter

def load_and_split_docs(save_path="chunks.jsonl"):
    folder = os.path.join(os.path.dirname(__file__), "docs")
    print("🔍 Searching files in folder:", folder)

    docs = []

    for file in os.listdir(folder):
        file_path = os.path.join(folder, file)
        ext = file.lower()

        try:
            if ext.endswith(".txt"):
                docs.extend(TextLoader(file_path, encoding="utf-8").load())
            elif ext.endswith(".pdf"):
                docs.extend(PyPDFLoader(file_path).load())
            elif ext.endswith(".docx"):
                docs.extend(Docx2txtLoader(file_path).load())
            elif ext.endswith(".md"):
                docs.extend(UnstructuredMarkdownLoader(file_path).load())
        except Exception as e:
            print(f"⚠ Error reading {file}: {e}")

    print("📌 Total documents loaded:", len(docs))

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(docs)

    with open(save_path, "w", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps({"text": c.page_content}) + "\n")

    print(f"🔥 Total chunks saved: {len(chunks)}")
    print(f"📁 File saved at: {save_path}")


if __name__ == "__main__":
    load_and_split_docs()
