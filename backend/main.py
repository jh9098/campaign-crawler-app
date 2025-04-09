# backend/main.py

print("✅ CORS 설정 적용됨")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from crawler import run_crawler
import io
import zipfile

app = FastAPI()

# CORS 허용 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 또는 ["https://dbgapp.netlify.app"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OPTIONS 프리플라이트 요청 허용
@app.options("/crawl")
async def options_handler(request: Request):
    return JSONResponse(content={}, status_code=200)

# 요청 파라미터 모델
class CrawlRequest(BaseModel):
    session_cookie: str
    selected_days: list[str]
    exclude_keywords: list[str]
    use_full_range: bool = True
    start_id: int | None = None
    end_id: int | None = None

@app.post("/crawl")
async def crawl_handler(req: CrawlRequest):
    try:
        print("📥 크롤링 요청 수신됨")
        hidden, public = run_crawler(
            session_cookie=req.session_cookie,
            selected_days=req.selected_days,
            exclude_keywords=req.exclude_keywords,
            use_full_range=req.use_full_range,
            start_id=req.start_id,
            end_id=req.end_id
        )

        # 결과 없으면 오류 반환
        if not hidden and not public:
            return JSONResponse(content={"error": "크롤링 결과가 없습니다."}, status_code=400)

        print(f"📦 숨김 캠페인 수: {len(hidden)}")
        print(f"📦 공개 캠페인 수: {len(public)}")

        # 메모리 내 zip 파일 생성
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("result_hidden.txt", "\n".join(hidden))
            zf.writestr("result_public.txt", "\n".join(public))

        memory_file.seek(0)
        print("✅ zip 파일 생성 완료")

        return StreamingResponse(
            memory_file,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=campaign_results.zip"}
        )

    except Exception as e:
        print("❌ 서버 처리 중 오류 발생:", str(e))
        return JSONResponse(content={"error": str(e)}, status_code=500)
