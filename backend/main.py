from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from crawler import run_crawler_streaming
import json
import asyncio
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://dbgapp.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 세션 쿠키별 연결 그룹과 태스크 관리
active_sessions = {}  # { session_cookie: [websocket1, websocket2, ...] }
ongoing_tasks = {}    # { session_cookie: asyncio.Task }

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
        exclude_ids = set(map(int, data.get("exclude_ids", [])))

        # 문자열 처리
        if isinstance(selected_days, str):
            selected_days = [s.strip() for s in selected_days.split(",") if s.strip()]
        if isinstance(exclude_keywords, str):
            exclude_keywords = [k.strip() for k in exclude_keywords.split(",") if k.strip()]

        # 그룹 등록
        if session_cookie not in active_sessions:
            active_sessions[session_cookie] = []
        active_sessions[session_cookie].append(websocket)

        # 작업이 없다면 시작
        if session_cookie not in ongoing_tasks:
            task = asyncio.create_task(
                stream_to_all_clients(session_cookie, {
                    "session_cookie": session_cookie,
                    "selected_days": selected_days,
                    "exclude_keywords": exclude_keywords,
                    "use_full_range": use_full_range,
                    "start_id": start_id,
                    "end_id": end_id,
                    "exclude_ids": exclude_ids
                })
            )
            ongoing_tasks[session_cookie] = task

        # 연결 유지 (ping 대기)
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        print("❌ 연결 끊김")
    finally:
        if session_cookie in active_sessions:
            if websocket in active_sessions[session_cookie]:
                active_sessions[session_cookie].remove(websocket)
            if not active_sessions[session_cookie]:
                # 해당 세션 모두 종료되면 작업 취소
                task = ongoing_tasks.pop(session_cookie, None)
                if task:
                    task.cancel()
                del active_sessions[session_cookie]

async def stream_to_all_clients(session_cookie: str, data: dict):
    print(f"🚀 크롤링 시작: {session_cookie} @ {datetime.now()}")
    try:
        async for result in run_crawler_streaming(**data):
            msg = json.dumps(result)
            receivers = active_sessions.get(session_cookie, [])
            for ws in receivers:
                try:
                    await ws.send_text(msg)
                except:
                    continue
        # 완료 메시지 전송
        for ws in active_sessions.get(session_cookie, []):
            try:
                await ws.send_text(json.dumps({"event": "done", "data": "크롤링 완료"}))
            except:
                pass
    except asyncio.CancelledError:
        print(f"🛑 크롤링 중단: {session_cookie}")
    except Exception as e:
        for ws in active_sessions.get(session_cookie, []):
            try:
                await ws.send_text(json.dumps({"event": "error", "data": str(e)}))
            except:
                pass
