from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from crawler import run_crawler_streaming
import asyncio

app = FastAPI()

# 일반 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # <- 반드시 * 또는 frontend origin 명시
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OPTIONS 프리플라이트 핸들링
@app.options("/crawl/stream")
async def options_handler(request: Request):
    return JSONResponse(content={}, status_code=200)

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
                yield f"event: {result['event']}\ndata: {result['data']}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {str(e)}\n\n"

    # 👇 여기서 반드시 CORS 허용 헤더를 직접 명시해야 함
    return EventSourceResponse(
        event_generator(),
        headers={
            "Access-Control-Allow-Origin": "*",  # 또는 "https://dbgapp.netlify.app"
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"  # 일부 리버스 프록시에서 SSE 버퍼링 방지
        }
    )
