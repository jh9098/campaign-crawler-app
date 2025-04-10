from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from crawler import run_crawler_streaming
import json
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://dbgapp.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/crawl")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        params = await websocket.receive_text()
        data = json.loads(params)

        session_cookie = data.get("session_cookie")
        selected_days = data.get("selected_days", [])
        exclude_keywords = data.get("exclude_keywords", [])
        use_full_range = data.get("use_full_range", True)
        start_id = data.get("start_id")
        end_id = data.get("end_id")

        # ✅ 문자열로 들어온 경우 보정
        if isinstance(selected_days, str):
            selected_days = [s.strip() for s in selected_days.split(",") if s.strip()]
        if isinstance(exclude_keywords, str):
            exclude_keywords = [k.strip() for k in exclude_keywords.split(",") if k.strip()]

        # ✅ 테스트용 로그 출력
        print("🧪 WebSocket 수신 파라미터:")
        print(f"   use_full_range: {use_full_range} ({type(use_full_range)})")
        print(f"   start_id: {start_id} ({type(start_id)})")
        print(f"   end_id: {end_id} ({type(end_id)})")

        async def send_result():
            for result in run_crawler_streaming(
                session_cookie=session_cookie,
                selected_days=selected_days,
                exclude_keywords=exclude_keywords,
                use_full_range=use_full_range,
                start_id=start_id,
                end_id=end_id
            ):
                await asyncio.sleep(0.005)
                await websocket.send_text(json.dumps(result))
            await websocket.send_text(json.dumps({"event": "done", "data": "크롤링 완료"}))

        await send_result()

    except WebSocketDisconnect:
        print("❌ 클라이언트 연결 끊김")
    except Exception as e:
        await websocket.send_text(json.dumps({"event": "error", "data": str(e)}))
