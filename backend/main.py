# ✅ main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from crawler import run_crawler_streaming
import asyncio

app = FastAPI()

# ✅ CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 필요한 경우 Netlify 주소만 지정 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ OPTIONS 프리플라이트 처리
@app.options("/crawl/stream")
async def options_handler(request: Request):
    return JSONResponse(content={}, status_code=200)

# ✅ SSE 엔드포인트
@app.get("/crawl/stream")
async def crawl_stream(
    session_cookie: str,
    selected_days: str,
    exclude_keywords: str,
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
                yield {
                    "event": result["event"],
                    "data": result["data"]
                }
        except Exception as e:
            yield {
                "event": "error",
                "data": str(e)
            }

    # ✅ CORS 헤더 명시적으로 추가
    return EventSourceResponse(
        event_generator(),
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # nginx나 프록시가 버퍼링 방지
        }
    )
