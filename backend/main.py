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

# ✅ CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 운영 시에는 ["https://dbgapp.netlify.app"] 등으로 제한 권장
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Preflight 요청 대응
@app.options("/crawl")
async def options_handler(request: Request):
    return JSONResponse(content={}, status_code=200)

# ✅ 요청 모델 정의
class CrawlRequest(BaseModel):
    session_cookie: str
    selected_days: list[str]
    exclude_keywords: list[str]
    use_full_range: bool = True
    start_id: int | None = None
    end_id: int | None = None

# ✅ 크롤링 실행 및 zip 응답
@app.post("/crawl")
async def crawl_handler(req: CrawlRequest):
    try:
        hidden, public = run_crawler(
            session_cookie=req.session_cookie,
            selected_days=req.selected_days,
            exclude_keywords=req.exclude_keywords,
            use_full_range=req.use_full_range,
            start_id=req.start_id,
            end_id=req.end_id
        )

        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("result_hidden.txt", "\n".join(hidden))
            zf.writestr("result_public.txt", "\n".join(public))

        memory_file.seek(0)
        return StreamingResponse(
            memory_file,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=campaign_results.zip"}
        )

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
