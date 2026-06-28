from app.services.ai_service import _get_groq
from app.config import settings

print("Key from settings:", settings.GROQ_API_KEY[:20])
client = _get_groq()
print("Client:", client)

if client:
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "say hello"}],
        max_tokens=10
    )
    print("Response:", resp.choices[0].message.content)
else:
    print("CLIENT IS NONE - Problem in _get_groq!")