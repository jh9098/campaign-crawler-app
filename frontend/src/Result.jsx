import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Result() {
  const navigate = useNavigate();
  const [hiddenResults, setHiddenResults] = useState([]);
  const [publicResults, setPublicResults] = useState([]);
  const [filter, setFilter] = useState({ hidden: "", public: "" });
  const [status, setStatus] = useState("⏳ 서버에서 데이터를 받고 있습니다...");
  const eventSourceRef = useRef(null);

  useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const cookie = urlParams.get("session_cookie");
  const selected_days = urlParams.get("selected_days");
  const exclude_keywords = urlParams.get("exclude_keywords") || "";
  const use_full_range = urlParams.get("use_full_range") === "true";
  const start_id = urlParams.get("start_id");
  const end_id = urlParams.get("end_id");

  if (!cookie || !selected_days) {
    setStatus("❌ 세션 정보 누락. 처음 화면에서 다시 실행해주세요.");
    return;
  }

  const query = new URLSearchParams({
    session_cookie: cookie,
    selected_days,
    exclude_keywords,
    use_full_range,
  });

  if (!use_full_range && start_id && end_id) {
    query.append("start_id", start_id);
    query.append("end_id", end_id);
  }

  const eventSource = new EventSource(
    `https://campaign-crawler-app.onrender.com/crawl/stream?${query.toString()}`
  );
  eventSourceRef.current = eventSource;

  eventSource.addEventListener("hidden", (e) => {
    if (e?.data) setHiddenResults((prev) => [...prev, e.data]);
  });

  eventSource.addEventListener("public", (e) => {
    if (e?.data) setPublicResults((prev) => [...prev, e.data]);
  });

  eventSource.addEventListener("done", () => {
    setStatus("✅ 데이터 수신 완료");
    eventSource.close();
  });

  eventSource.addEventListener("error", (e) => {
    console.error("❌ SSE 오류 발생:", e);
    setStatus("❌ 서버 연결이 끊어졌습니다. 페이지를 새로고침하거나 처음부터 다시 시도해주세요.");
    eventSource.close();
  });

  return () => {
    eventSource.close();
  };
}, []);


    return () => eventSource.close();
  }, []);

  const downloadTxt = (data, filename) => {
    const sorted = [...data].sort((a, b) => {
      const timeA = a.split(" & ")[5];
      const timeB = b.split(" & ")[5];
      return timeA.localeCompare(timeB);
    });
    const blob = new Blob([sorted.join("\n")], { type: "text/plain" });
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

    return (
      <div style={{ marginBottom: 40 }}>
        <h3>
          {title} ({filtered.length}건)
          <button
            onClick={() =>
              downloadTxt(
                filtered,
                isHidden ? "숨김캠페인.txt" : "공개캠페인.txt"
              )
            }
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
          value={isHidden ? filter.hidden : filter.public}
          onChange={(e) =>
            setFilter((prev) => ({
              ...prev,
              [isHidden ? "hidden" : "public"]: e.target.value,
            }))
          }
          style={{ marginBottom: 10, width: 300 }}
        />

        <table
          border="1"
          cellPadding="6"
          style={{ borderCollapse: "collapse", width: "100%" }}
        >
          <thead>
            <tr>
              <th>No</th>
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
              const [type, review, mall, price, point, time, name, url] =
                row.split(" & ");
              const match = url.match(/csq=(\d+)/);
              const csq = match ? match[1] : "-";
              return (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{type}</td>
                  <td>{review}</td>
                  <td>{mall}</td>
                  <td>{price}</td>
                  <td>{point}</td>
                  <td>{time}</td>
                  <td>{name}</td>
                  <td>
                    <a href={url} target="_blank" rel="noreferrer">
                      바로가기
                    </a>
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
      <br />
      <br />
      {renderTable(hiddenResults, "🔒 숨겨진 캠페인", true)}
      {renderTable(publicResults, "🌐 공개 캠페인", false)}
    </div>
  );
}
