import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hiddenResults, setHiddenResults] = useState([]);
  const [publicResults, setPublicResults] = useState([]);
  const [filter, setFilter] = useState({ hidden: "", public: "" });
  const [status, setStatus] = useState("⏳ 데이터를 수신 중입니다...");
  const socketRef = useRef(null);
  const fetchedCsq = useRef(new Set());

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
    const allCsqs = [...savedHidden, ...savedPublic]
      .map(getCsq)
      .filter((csq) => csq);
    fetchedCsq.current = new Set(allCsqs);
  }, []);

  useEffect(() => {
    localStorage.setItem("hiddenResults", JSON.stringify(hiddenResults));
  }, [hiddenResults]);

  useEffect(() => {
    localStorage.setItem("publicResults", JSON.stringify(publicResults));
  }, [publicResults]);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const session_cookie = urlParams.get("session_cookie");
    const selected_days = urlParams.get("selected_days");
    const exclude_keywords = urlParams.get("exclude_keywords") || "";
    const use_full_range = urlParams.get("use_full_range") === "true";
    const start_id_raw = urlParams.get("start_id");
    const end_id_raw = urlParams.get("end_id");

    if (!session_cookie || !selected_days) {
      setStatus("❌ 세션 정보 누락. 처음부터 다시 시도해주세요.");
      return;
    }

    const payload = {
      session_cookie,
      selected_days,
      exclude_keywords,
      use_full_range,
      exclude_ids: Array.from(fetchedCsq.current),
    };

    if (!use_full_range) {
      if (!start_id_raw || !end_id_raw) {
        setStatus("❌ 수동 범위가 누락되었습니다. App 화면에서 다시 설정해주세요.");
        return;
      }
      const start_id = parseInt(start_id_raw);
      const end_id = parseInt(end_id_raw);
      if (isNaN(start_id) || isNaN(end_id) || start_id >= end_id) {
        setStatus("❌ 유효하지 않은 캠페인 ID 범위입니다.");
        return;
      }
      payload.start_id = start_id;
      payload.end_id = end_id;
    }

    if (socketRef.current) {
      socketRef.current.close();
    }

    const socket = new WebSocket("wss://campaign-crawler-app.onrender.com/ws/crawl");
    socketRef.current = socket;

    socket.onopen = () => {
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
        console.error("❌ 오류:", data);
        setStatus("❌ 에러 발생: " + data);
        socket.close();
      }
    };

    socket.onerror = (e) => {
      console.error("❌ WebSocket 오류", e);
      setStatus("❌ 서버 연결 오류");
    };

    socket.onclose = () => {
      console.log("🔌 연결 종료됨");
    };

    return () => socket.close();
  }, [location.search]);

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
            style={{
              marginLeft: 12,
              padding: "4px 10px",
              fontSize: 14,
              display: data.length > 0 ? "inline-block" : "none",
            }}
          >
            📥 다운로드
          </button>
        </h3>

        <input
          type="text"
          placeholder="🔎 필터링할 키워드를 입력하세요"
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
                    <button
                      onClick={() => handleDelete(realIndex)}
                      style={{
                        backgroundColor: "red",
                        color: "white",
                        border: "none",
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                    >
                      삭제
                    </button>
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
