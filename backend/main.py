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
    print("✅ WebSocket 연결 수락됨")
    try:
        params = await websocket.receive_text()
        data = json.loads(params)

        session_cookie = data.get("session_cookie")
        selected_days = data.get("selected_days", [])
        exclude_keywords = data.get("exclude_keywords", [])
        use_full_range = data.get("use_full_range", True)
        start_id = data.get("start_id")
        end_id = data.get("end_id")
        exclude_ids = set(map(int, data.get("exclude_ids", [])))

        if isinstance(selected_days, str):
            selected_days = [s.strip() for s in selected_days.split(",") if s.strip()]
        if isinstance(exclude_keywords, str):
            exclude_keywords = [k.strip() for k in exclude_keywords.split(",") if k.strip()]

        async def send_results():
            await asyncio.sleep(0.01)  # ✅ 핑 먼저 돌 수 있도록 짧은 대기
            for result in run_crawler_streaming(
                session_cookie=session_cookie,
                selected_days=selected_days,
                exclude_keywords=exclude_keywords,
                use_full_range=use_full_range,
                start_id=start_id,
                end_id=end_id,
                exclude_ids=exclude_ids
            ):
                await asyncio.sleep(0.005)
                await websocket.send_text(json.dumps(result))
            await websocket.send_text(json.dumps({"event": "done", "data": "크롤링 완료"}))

        async def send_heartbeat():
            while True:
                await asyncio.sleep(5)
                print("💓 서버 → 클라이언트 ping 전송")
                await websocket.send_text(json.dumps({"event": "ping", "data": "💓"}))

        async def receive_pong():
            while True:
                try:
                    msg = await websocket.receive_text()
                    pong = json.loads(msg)
                    if pong.get("event") == "pong":
                        print("💓 클라이언트 → 서버 pong 수신")
                except WebSocketDisconnect:
                    print("❌ 클라이언트 연결 끊김 (pong 대기 중)")
                    break

        await asyncio.gather(send_results(), send_heartbeat(), receive_pong())

    except WebSocketDisconnect:
        print("❌ 클라이언트 연결 끊김")
    except Exception as e:
        await websocket.send_text(json.dumps({"event": "error", "data": str(e)}))
