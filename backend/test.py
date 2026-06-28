from groq import Groq
from app.config import settings

print("API Key:", settings.GROQ_API_KEY[:20])
print("Provider:", settings.AI_PROVIDER)

client = Groq(api_key=settings.GROQ_API_KEY)
resp = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": "say hello"}],
    max_tokens=10
)
print("Response:", resp.choices[0].message.content)