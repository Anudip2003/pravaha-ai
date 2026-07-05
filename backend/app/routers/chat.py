from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import os
import traceback

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT = """You are Pravaha's AI finance advisor for India.
Help users with budgeting, SIP, mutual funds, tax saving, and investments.
Give India-specific advice. Never recommend specific stocks. This is educational guidance only."""

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]

@router.post("")
async def chat(req: ChatRequest):
    try:
        from app.core.config import settings
        api_key = settings.GEMINI_API_KEY
        print("API KEY FOUND:", bool(api_key))
        print("MESSAGES:", req.messages)

        contents = []
        for m in req.messages:
            role = "user" if m.role == "user" else "model"
            contents.append({"role": role, "parts": [{"text": m.content}]})

        print("CONTENTS BUILT:", contents)

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}",
                headers={"Content-Type": "application/json"},
                json={
                    "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                    "contents": contents,
                },
            )

        print("GEMINI STATUS:", response.status_code)
        print("GEMINI RESPONSE:", response.text[:500])

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Gemini error: {response.text}")

        data = response.json()
        reply = data["candidates"][0]["content"]["parts"][0]["text"]
        return {"reply": reply}

    except HTTPException:
        raise
    except Exception as e:
        print("EXCEPTION:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))