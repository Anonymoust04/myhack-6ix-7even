import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

model = "models/gemini-embedding-001"
text = "Hello world"
result = genai.embed_content(model=model, content=text, task_type="RETRIEVAL_DOCUMENT")
embedding = result["embedding"]

print(f"Model: {model}")
print(f"Embedding Length: {len(embedding)}")
