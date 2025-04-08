# backend/main.py

print("✅ CORS 설정 적용됨")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from crawler import run_crawler

app = FastAPI()

# ✅ CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 또는 ["https://dbgapp.netlify.app"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ preflight 요청 명시적으로 허용
@app.options("/crawl")
async def options_handler(request: Request):
    return JSONResponse(content={}, status_code=200)

class CrawlRequest(BaseModel):
    session_cookie: str
    selected_days: list[str]
    exclude_keywords: list[str]

@app.post("/crawl")
async def crawl_handler(req: CrawlRequest):
    try:
        hidden, public = run_crawler(
            session_cookie=req.session_cookie,
            selected_days=req.selected_days,
            exclude_keywords=req.exclude_keywords
        )
        return {"hidden": hidden, "public": public}
    except Exception as e:
        return {"error": str(e)}
