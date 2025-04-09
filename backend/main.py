# ✅ main.py (SSE 방식 실시간 전송)

print("✅ CORS 설정 적용됨")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from crawler import run_crawler_streaming
import asyncio
from sse_starlette.sse import EventSourceResponse
app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OPTIONS preflight
@app.options("/crawl/stream")
async def options_handler(request: Request):
    return JSONResponse(content={}, status_code=200)

# SSE 응답용 GET 엔드포인트
@app.get("/crawl/stream")
async def crawl_stream(
    session_cookie: str,
    selected_days: str,         # e.g., "01일,02일"
    exclude_keywords: str,      # e.g., "이발기,깔창"
    use_full_range: bool = True,
    start_id: int = None,
    end_id: int = None
):
    selected_days_list = [d.strip() for d in selected_days.split(",") if d.strip()]
    exclude_keywords_list = [k.strip() for k in exclude_keywords.split(",") if k.strip()]

    async def event_generator():
        try:
            for result in run_crawler_streaming(
                session_cookie=session_cookie,
                selected_days=selected_days_list,
                exclude_keywords=exclude_keywords_list,
                use_full_range=use_full_range,
                start_id=start_id,
                end_id=end_id
            ):
                await asyncio.sleep(0.005)
                if result["event"] == "hidden":
                    yield f"event: hidden\ndata: {result['data']}\n\n"
                elif result["event"] == "public":
                    yield f"event: public\ndata: {result['data']}\n\n"
                elif result["event"] == "done":
                    yield f"event: done\ndata: {result['data']}\n\n"
                elif result["event"] == "error":
                    yield f"event: error\ndata: {result['data']}\n\n"
                    return  # 에러 발생 시 종료
        except Exception as e:
            yield f"event: error\ndata: {str(e)}\n\n"

    return EventSourceResponse(event_generator())
