# ✅ main.py (SSE 방식 실시간 결과 전송)

print("✅ CORS 설정 적용됨")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import EventSourceResponse
from pydantic import BaseModel
from crawler import run_crawler_streaming
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.options("/crawl/stream")
async def options_handler(request: Request):
    return JSONResponse(content={}, status_code=200)

@app.get("/crawl/stream")
async def crawl_stream(
    session_cookie: str,
    selected_days: str,       # "01일,02일"
    exclude_keywords: str,    # "이발기,깔창"
    use_full_range: bool = True,
    start_id: int = None,
    end_id: int = None
):
    selected_days_list = [d.strip() for d in selected_days.split(",") if d.strip()]
    exclude_keywords_list = [k.strip() for k in exclude_keywords.split(",") if k.strip()]

    async def event_generator():
        try:
            for h, p in run_crawler_streaming(
                session_cookie=session_cookie,
                selected_days=selected_days_list,
                exclude_keywords=exclude_keywords_list,
                use_full_range=use_full_range,
                start_id=start_id,
                end_id=end_id
            ):
                await asyncio.sleep(0.005)
                if h:
                    yield f"event: hidden\ndata: {h}\n\n"
                if p:
                    yield f"event: public\ndata: {p}\n\n"
            yield "event: done\ndata: 완료\n\n"
        except Exception as e:
            yield f"event: error\ndata: {str(e)}\n\n"

    return EventSourceResponse(event_generator())
