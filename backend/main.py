from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from crawler import run_crawler_streaming
import asyncio
import json
app = FastAPI()

# ✅ 일반적인 요청(CORS 대응)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://dbgapp.netlify.app"],  # 정확한 origin 명시
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ OPTIONS 요청 대응 (SSE 프리플라이트 대응)
@app.options("/crawl/stream")
async def options_handler(request: Request):
    headers = {
        "Access-Control-Allow-Origin": "https://dbgapp.netlify.app",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
    }
    return JSONResponse(content={}, status_code=200, headers=headers)

# ✅ SSE 엔드포인트 (헤더 직접 명시)
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
                # ✅ data는 반드시 문자열이어야 하고 \n\n 로 구분해야 함
                yield (
                    f"event: {result['event']}\n"
                    f"data: {json.dumps(result['data'])}\n\n"
                )
        except Exception as e:
            yield f"event: error\ndata: {json.dumps(str(e))}\n\n"


    return EventSourceResponse(
        event_generator(),
        headers={
            # 🚨 이 부분이 핵심입니다
            "Access-Control-Allow-Origin": "https://dbgapp.netlify.app",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"  # nginx 같은 프록시에서 버퍼링 방지
        }
    )
