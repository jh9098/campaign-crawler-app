from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from crawler import run_crawler_streaming
import json
import asyncio

app = FastAPI()

# ✅ CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://dbgapp.netlify.app"],  # 실제 배포된 프론트 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/crawl")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        # ✅ 클라이언트에서 보낸 파라미터 수신
        params = await websocket.receive_text()
        data = json.loads(params)

        session_cookie = data.get("session_cookie")
        selected_days = data.get("selected_days", [])
        exclude_keywords = data.get("exclude_keywords", [])
        use_full_range = data.get("use_full_range", True)
        start_id = data.get("start_id")
        end_id = data.get("end_id")

        if isinstance(selected_days, str):
            selected_days = [s.strip() for s in selected_days.split(",") if s.strip()]
        if isinstance(exclude_keywords, str):
            exclude_keywords = [k.strip() for k in exclude_keywords.split(",") if k.strip()]

        # ✅ 크롤링 결과 전송 task
        async def send_results():
            if use_full_range:
                public_campaigns = get_public_campaigns(session_cookie)
                if not public_campaigns:
                    await websocket.send_text(json.dumps({"event": "error", "data": "공개 캠페인 정보를 가져오지 못했습니다."}))
                    return
                total_count = max(public_campaigns) - min(public_campaigns) + 1
            elif start_id is not None and end_id is not None:
                total_count = end_id - start_id + 1
            else:
                await websocket.send_text(json.dumps({"event": "error", "data": "범위를 확인할 수 없습니다."}))
                return
        
            await websocket.send_text(json.dumps({"event": "init", "data": {"total": total_count}}))
        
            for result in run_crawler_streaming(
                session_cookie=session_cookie,
                selected_days=selected_days,
                exclude_keywords=exclude_keywords,
                use_full_range=use_full_range,
                start_id=start_id,
                end_id=end_id
            ):
                await websocket.send_text(json.dumps(result))
            await websocket.send_text(json.dumps({"event": "done", "data": "크롤링 완료"}))

        # ✅ 5초마다 ping 메시지 전송 task
        async def send_heartbeat():
            while True:
                await asyncio.sleep(5)
                await websocket.send_text(json.dumps({"event": "ping", "data": "💓"}))

        # ✅ 둘 다 동시에 실행
        await asyncio.gather(
            send_results(),
            send_heartbeat()
        )

    except WebSocketDisconnect:
        print("❌ 클라이언트 연결 끊김")
    except Exception as e:
        await websocket.send_text(json.dumps({"event": "error", "data": f"서버 오류: {str(e)}"}))
