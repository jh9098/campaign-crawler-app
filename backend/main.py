from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from crawler import run_crawler_streaming
import asyncio

app = FastAPI()

# ✅ CORS 허용 - 일반 요청용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 또는 ["https://dbgapp.netlify.app"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 프리플라이트 OPTIONS 대응
@app.options("/crawl/stream")
async def options_handler(request: Request):
    headers = {
        "Access-Control-Allow-Origin": "*",  # 또는 Netlify 도메인
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
    }
    return JSONResponse(content={}, status_code=200, headers=headers)

# ✅ SSE 스트리밍 엔드포인트
@app.get("/crawl/stream")
async def crawl_stream(
    request: Request,
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

    # ✅ SSE 전용 CORS 헤더 명시
    return EventSourceResponse(
        event_generator(),
        headers={
            "Access-Control-Allow-Origin": "*",  # 또는 정확한 도메인: "https://dbgapp.netlify.app"
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )
