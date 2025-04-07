from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from crawler import run_crawler

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CrawlRequest(BaseModel):
    session_cookie: str
    selected_days: list[str]
    exclude_keywords: list[str]

@app.post("/crawl")
async def crawl_handler(req: CrawlRequest):
    print("🧾 받은 요청:", req)
    try:
        hidden, public = run_crawler(
            session_cookie=req.session_cookie,
            selected_days=req.selected_days,
            exclude_keywords=req.exclude_keywords
        )
        print("✅ 크롤링 완료, hidden:", len(hidden), "public:", len(public))
        return {"hidden": hidden, "public": public}
    except Exception as e:
        print("❌ 서버 내부 오류:", e)
        return {"error": str(e)}

