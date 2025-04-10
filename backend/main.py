from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from crawler import run_crawler_streaming
import json
import asyncio

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://dbgapp.netlify.app"],  # 실제 사용 중인 도메인
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

        # ✅ 문자열로 들어온 경우를 위한 안전한 정수 변환
        try:
            if start_id is not None:
                start_id = int(start_id)
            if end_id is not None:
                end_id = int(end_id)
        except ValueError:
            start_id = None
            end_id = None

        # ✅ 리스트 형태 보정
        if isinstance(selected_days, str):
            selected_days = [s.strip() for s in selected_days.split(",") if s.strip()]
        if isinstance(exclude_keywords, str):
            exclude_keywords = [k.strip() for k in exclude_keywords.split(",") if k.strip()]

        # ✅ 현재 수신 상태 로그
        print("🧪 WebSocket 수신 파라미터:")
        print(f"   use_full_range: {use_full_range} ({type(use_full_range)})")
        print(f"   start_id: {start_id} ({type(start_id)})")
        print(f"   end_id: {end_id} ({type(end_id)})")

        # ✅ 비동기 크롤링 결과 전송
        async def send_result():
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

        await send_result()

    except WebSocketDisconnect:
        print("❌ 클라이언트 연결 끊김")
    except Exception as e:
        await websocket.send_text(json.dumps({"event": "error", "data": str(e)}))
