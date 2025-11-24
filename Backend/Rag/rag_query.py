from langchain_groq import ChatGroq
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from dotenv import load_dotenv
import os

load_dotenv()

# GROQ API
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# LLM
llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="llama-3.3-70b-versatile"
)

# Embeddings
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# Vector store
vectordb = FAISS.load_local("vector_store", embeddings, allow_dangerous_deserialization=True)
retriever = vectordb.as_retriever()

def rag_answer(query: str):
    """
    Hybrid RAG:
    → Answer from documents first
    → If not found → fallback to normal chatbot response
    """
    docs = retriever.invoke(query)
    context = "\n\n".join([d.page_content for d in docs]) if docs else ""

    # 1️⃣ Try RAG Response
    prompt_rag = f"""
You are an AI assistant with access to a document knowledge base.
Answer ONLY using the Document Context.

Document Context:
{context}

User Question:
{query}

If the answer is not present in context, respond with exactly: "NOT_FOUND".
"""
    rag_response = llm.invoke(prompt_rag).content.strip()

    # 2️⃣ If NOT_FOUND → fallback to normal LLM chat
    if "NOT_FOUND" in rag_response or rag_response == "" or len(context) < 5:
        normal_response = llm.invoke(query).content
        return normal_response, " No document matched (fallback to LLM)."

    # 3️⃣ Normal document answer
    return rag_response, " RAG document context used."

if __name__ == "__main__":
    while True:
        q = input("\nAsk something (or type 'exit'): ")
        if q.lower() == "exit":
            break
        ans, ctx = rag_answer(q)
        print("\n Answer:", ans)
        print("\n Mode:", ctx)
