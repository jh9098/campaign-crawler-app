// ✅ result.jsx (자동 WebSocket 재접속 + 중복 캠페인 skip 유지)

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Result() {
  const navigate = useNavigate();
  const [hiddenResults, setHiddenResults] = useState([]);
  const [publicResults, setPublicResults] = useState([]);
  const [filter, setFilter] = useState({ hidden: "", public: "" });
  const [status, setStatus] = useState("⏳ 데이터를 수신 중입니다...");
  const [retryCount, setRetryCount] = useState(0);
  const fetchedCsq = useRef(new Set());
  const socketRef = useRef(null);
  const reconnectTimeout = useRef(null);

  const getCsq = (row) => {
    const match = row.match(/csq=(\d+)/);
    return match ? match[1] : null;
  };

  const insertUniqueSorted = (arr, newItem) => {
    const csq = getCsq(newItem);
    if (!csq || fetchedCsq.current.has(csq)) return arr;
    fetchedCsq.current.add(csq);
    const filtered = arr.filter((item) => getCsq(item) !== csq);
    filtered.push(newItem);
    return filtered.sort((a, b) => {
      const timeA = a.split(" & ")[5];
      const timeB = b.split(" & ")[5];
      return timeA.localeCompare(timeB);
    });
  };

  useEffect(() => {
    const savedHidden = JSON.parse(localStorage.getItem("hiddenResults") || "[]");
    const savedPublic = JSON.parse(localStorage.getItem("publicResults") || "[]");
    setHiddenResults(savedHidden);
    setPublicResults(savedPublic);
    const allCsqs = [...savedHidden, ...savedPublic].map(getCsq).filter((csq) => csq);
    fetchedCsq.current = new Set(allCsqs);
  }, []);

  useEffect(() => {
    localStorage.setItem("hiddenResults", JSON.stringify(hiddenResults));
  }, [hiddenResults]);

  useEffect(() => {
    localStorage.setItem("publicResults", JSON.stringify(publicResults));
  }, [publicResults]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const session_cookie = urlParams.get("session_cookie");
    const selected_days = urlParams.get("selected_days");
    const exclude_keywords = urlParams.get("exclude_keywords") || "";
    const use_full_range = urlParams.get("use_full_range") === "true";
    const start_id = urlParams.get("start_id");
    const end_id = urlParams.get("end_id");

    const payload = {
      session_cookie,
      selected_days,
      exclude_keywords,
      use_full_range,
      exclude_ids: Array.from(fetchedCsq.current),
    };

    if (!use_full_range && start_id && end_id) {
      payload.start_id = parseInt(start_id);
      payload.end_id = parseInt(end_id);
    }

    const connectWebSocket = () => {
      const socket = new WebSocket("wss://campaign-crawler-app.onrender.com/ws/crawl");
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("✅ 연결됨. 크롤링 시작 중...");
        setRetryCount(0);
        socket.send(JSON.stringify(payload));
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const { event: type, data } = message;
        if (type === "hidden") {
          setHiddenResults((prev) => insertUniqueSorted(prev, data));
        } else if (type === "public") {
          setPublicResults((prev) => insertUniqueSorted(prev, data));
        } else if (type === "done") {
          setStatus("✅ 데이터 수신 완료");
          socket.close();
        } else if (type === "error") {
          setStatus("❌ 에러 발생: " + data);
          socket.close();
        }
      };

      socket.onerror = () => {
        setStatus("❌ 서버 오류. 다시 연결 시도 중...");
        socket.close();
      };

      socket.onclose = () => {
        if (retryCount < 5) {
          reconnectTimeout.current = setTimeout(() => {
            setRetryCount((prev) => prev + 1);
            connectWebSocket();
          }, 2000);
        } else {
          setStatus("❌ 서버 재연결 실패. 새로고침 해주세요.");
        }
      };
    };

    connectWebSocket();
    return () => {
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, []);

  const downloadTxt = (data, filename) => {
    const blob = new Blob([data.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <button
            onClick={() => downloadTxt(filtered, isHidden ? "숨김캠페인.txt" : "공개캠페인.txt")}
            style={{ marginLeft: 12, padding: "4px 10px", fontSize: 14 }}
          >📥 다운로드</button>
        </h3>
        <input
          type="text"
          placeholder="🔎 필터링할 키워드를 입력하세요"
          value={keyword}
          onChange={(e) => setFilter((prev) => ({ ...prev, [isHidden ? "hidden" : "public"]: e.target.value }))}
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
                  <td><button onClick={() => handleDelete(realIndex)} style={{ backgroundColor: "red", color: "white" }}>삭제</button></td>
                  <td>{type}</td>
                  <td>{review}</td>
                  <td>{mall}</td>
                  <td>{Number(price.replace(/[^\d]/g, "")).toLocaleString("ko-KR")}</td>
                  <td>{point}</td>
                  <td>{time}</td>
                  <td>{name}</td>
                  <td><a href={url} target="_blank" rel="noreferrer">바로가기</a></td>
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
