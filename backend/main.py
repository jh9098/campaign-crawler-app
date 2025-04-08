from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from crawler import run_crawler  # 경로는 상대경로 그대로

app = FastAPI()

# ✅ 정확한 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://dbgapp.netlify.app"],
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
    print("🧾 받은 요청:", req.session_cookie, req.selected_days, req.exclude_keywords)
    hidden, public = run_crawler(
        session_cookie=req.session_cookie,
        selected_days=req.selected_days,
        exclude_keywords=req.exclude_keywords
    )
    print(f"✅ 크롤링 완료, hidden: {len(hidden)} public: {len(public)}")
    return {"hidden": hidden, "public": public}
