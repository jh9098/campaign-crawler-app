# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from crawler import run_crawler

app = FastAPI()

# ✅ CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 배포 전 테스트용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 요청 본문 모델 정의
class CrawlRequest(BaseModel):
    session_cookie: str
    selected_days: list[str]
    exclude_keywords: list[str]

@app.post("/crawl")
async def crawl_handler(req: CrawlRequest):
    print(f"🧾 받은 요청: {req}")
    try:
        hidden, public = run_crawler(
            session_cookie=req.session_cookie,
            selected_days=req.selected_days,
            exclude_keywords=req.exclude_keywords
        )
        print(f"✅ 크롤링 완료, hidden: {len(hidden)} public: {len(public)}")
        return {"hidden": hidden, "public": public}
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return {"error": str(e)}
