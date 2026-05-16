import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

print("Checking available models...")
for m in genai.list_models():
    if 'embedContent' in m.supported_generation_methods:
        print(f"ID: {m.name}, Display: {m.display_name}")
