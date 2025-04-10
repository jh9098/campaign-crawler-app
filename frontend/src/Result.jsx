// result.jsx
// ✅ 중복 제거 재연결 + 자동 재시도 + WebSocket 기반 + ping/pong 응답
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Result() {
  const navigate = useNavigate();
  const [hiddenResults, setHiddenResults] = useState([]);
  const [publicResults, setPublicResults] = useState([]);
  const [fetchedCsq, setFetchedCsq] = useState(new Set());
  const [filter, setFilter] = useState({ hidden: "", public: "" });
  const [status, setStatus] = useState("⏳ 데이터를 수신 중입니다...");
  const socketRef = useRef(null);
  const retryRef = useRef(0);

  const getCsq = (row) => {
    const match = row.match(/csq=(\d+)/);
    return match ? match[1] : null;
  };

  const insertUniqueSorted = (arr, newItem, isHidden = false) => {
    const csq = getCsq(newItem);
    if (!csq || fetchedCsq.has(csq)) return arr;
    setFetchedCsq((prev) => new Set(prev).add(csq));
    const filtered = arr.filter((item) => getCsq(item) !== csq);
    filtered.push(newItem);
    return filtered.sort((a, b) => {
      const timeA = a.split(" & ")[5];
      const timeB = b.split(" & ")[5];
      return timeA.localeCompare(timeB);
    });
  };

  const connectWebSocket = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const session_cookie = urlParams.get("session_cookie");
    const selected_days = urlParams.get("selected_days");
    const exclude_keywords = urlParams.get("exclude_keywords") || "";
    const use_full_range = urlParams.get("use_full_range") === "true";
    const start_id = urlParams.get("start_id");
    const end_id = urlParams.get("end_id");

    if (!session_cookie || !selected_days) {
      setStatus("❌ 세션 정보 누락. 처음부터 다시 시도해주세요.");
      return;
    }

    const socket = new WebSocket("wss://campaign-crawler-app.onrender.com/ws/crawl");
    socketRef.current = socket;

    socket.onopen = () => {
      retryRef.current = 0;
      socket.send(
        JSON.stringify({
          session_cookie,
          selected_days,
          exclude_keywords,
          use_full_range,
          start_id: start_id ? parseInt(start_id) : undefined,
          end_id: end_id ? parseInt(end_id) : undefined,
          exclude_ids: Array.from(fetchedCsq),
        })
      );
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const { event: type, data } = message;

      if (type === "ping") {
        socket.send(JSON.stringify({ event: "pong", data: "💓" }));
        return;
      }

      if (type === "hidden") {
        setHiddenResults((prev) => insertUniqueSorted(prev, data, true));
      } else if (type === "public") {
        setPublicResults((prev) => insertUniqueSorted(prev, data, false));
      } else if (type === "done") {
        setStatus("✅ 데이터 수신 완료");
        socket.close();
      } else if (type === "error") {
        setStatus("❌ 오류: " + data);
        socket.close();
      }
    };

    socket.onclose = () => {
      console.log("🔌 연결 종료됨. 재시도...", retryRef.current);
      setStatus("⚠️ 연결 끊김. 재시도 중...");
      if (retryRef.current < 5) {
        setTimeout(() => {
          retryRef.current++;
          connectWebSocket();
        }, 3000);
      } else {
        setStatus("❌ 서버 연결 실패. 새로고침해주세요.");
      }
    };
  };

  useEffect(() => {
    const savedHidden = JSON.parse(localStorage.getItem("hiddenResults") || "[]");
    const savedPublic = JSON.parse(localStorage.getItem("publicResults") || "[]");
    setHiddenResults(savedHidden);
    setPublicResults(savedPublic);
  }, []);

  useEffect(() => {
    localStorage.setItem("hiddenResults", JSON.stringify(hiddenResults));
  }, [hiddenResults]);

  useEffect(() => {
    localStorage.setItem("publicResults", JSON.stringify(publicResults));
  }, [publicResults]);

  useEffect(() => {
    connectWebSocket();
    return () => socketRef.current?.close();
  }, []);

  const renderTable = (data, title, isHidden) => {
    const keyword = isHidden ? filter.hidden : filter.public;
    const filtered = data.filter((row) => row.includes(keyword));
    const setData = isHidden ? setHiddenResults : setPublicResults;

    const handleDelete = (idxToDelete) => {
      setData((prev) => {
        const updated = [...prev];
        updated.splice(idxToDelete, 1);
        return updated;
      });
    };

    return (
      <div style={{ marginBottom: 40 }}>
        <h3>
          {title} ({filtered.length}건)
        </h3>
        <input
          type="text"
          placeholder="🔎 키워드 필터"
          value={keyword}
          onChange={(e) =>
            setFilter((prev) => ({
              ...prev,
              [isHidden ? "hidden" : "public"]: e.target.value,
            }))
          }
          style={{ marginBottom: 10, width: 300 }}
        />
        <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>삭제</th>
              <th>구분</th>
              <th>리뷰</th>
              <th>쇼핑몰</th>
              <th>가격</th>
              <th>포인트</th>
              <th>시간</th>
              <th>상품명</th>
              <th>링크</th>
              <th>번호</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => {
              const [type, review, mall, price, point, time, name, url] = row.split(" & ");
              const csq = getCsq(url) || "-";
              const realIndex = data.findIndex((item) => item === row);
              return (
                <tr key={csq + "_" + idx}>
                  <td>
                    <button onClick={() => handleDelete(realIndex)} style={{ backgroundColor: "red", color: "white", border: "none" }}>삭제</button>
                  </td>
                  <td>{type}</td>
                  <td>{review}</td>
                  <td>{mall}</td>
                  <td>{Number(price.replace(/[^\d]/g, "")).toLocaleString("ko-KR")}</td>
                  <td>{point}</td>
                  <td>{time}</td>
                  <td>{name}</td>
                  <td>
                    <a href={url} target="_blank" rel="noreferrer">바로가기</a>
                  </td>
                  <td>{csq}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📡 실시간 크롤링 결과</h2>
      <p style={{ color: "green" }}>{status}</p>
      <button onClick={() => navigate("/")}>🔙 처음으로</button>
      <br /><br />
      {renderTable(hiddenResults, "🔒 숨겨진 캠페인", true)}
      {renderTable(publicResults, "🌐 공개 캠페인", false)}
    </div>
  );
}
