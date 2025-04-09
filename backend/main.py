from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from crawler import run_crawler_streaming
import json
import asyncio

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://dbgapp.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/crawl")
async def websocket_crawler(
    websocket: WebSocket,
):
    await websocket.accept()

    try:
        # Step 1: 최초 메시지 수신 (파라미터)
        init_data = await websocket.receive_json()
        session_cookie = init_data["session_cookie"]
        selected_days = [d.strip() for d in init_data["selected_days"].split(",")]
        exclude_keywords = [k.strip() for k in init_data["exclude_keywords"].split(",")]
        use_full_range = init_data.get("use_full_range", True)
        start_id = init_data.get("start_id")
        end_id = init_data.get("end_id")

        # Step 2: 크롤링 실행
        for result in run_crawler_streaming(
            session_cookie=session_cookie,
            selected_days=selected_days,
            exclude_keywords=exclude_keywords,
            use_full_range=use_full_range,
            start_id=start_id,
            end_id=end_id
        ):
            await asyncio.sleep(0.01)
            await websocket.send_json(result)

        await websocket.send_json({"event": "done", "data": "크롤링 완료"})

    except WebSocketDisconnect:
        print("❌ 클라이언트 연결 종료됨")
    except Exception as e:
        await websocket.send_json({"event": "error", "data": str(e)})
        await websocket.close()
