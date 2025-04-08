import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function App() {
  const [cookie, setCookie] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [exclude, setExclude] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const [rangeMode, setRangeMode] = useState("auto"); // 'auto' or 'manual'
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const days = Array.from({ length: 31 }, (_, i) => `${String(i + 1).padStart(2, "0")}일`);

  useEffect(() => {
    const savedCookie = localStorage.getItem("last_cookie");
    const savedDays = JSON.parse(localStorage.getItem("last_days") || "[]");
    const savedExclude = localStorage.getItem("last_exclude");

    if (savedCookie) setCookie(savedCookie);
    if (savedDays.length > 0) setSelectedDays(savedDays);
    if (savedExclude) setExclude(savedExclude);
  }, []);

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!cookie) {
      alert("PHPSESSID를 입력해주세요.");
      return;
    }

    if (selectedDays.length === 0) {
      alert("참여 날짜를 하나 이상 선택해주세요.");
      return;
    }

    setLoading(true);
    setProgress(0);

    localStorage.setItem("last_cookie", cookie);
    localStorage.setItem("last_days", JSON.stringify(selectedDays));
    localStorage.setItem("last_exclude", exclude);

    try {
      const response = await fetch("https://campaign-crawler-app.onrender.com/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_cookie: cookie,
          selected_days: selectedDays,
          exclude_keywords: exclude.split(",").map((kw) => kw.trim()),
          use_full_range: rangeMode === "auto",
          start_id: rangeMode === "manual" ? Number(rangeStart) : null,
          end_id: rangeMode === "manual" ? Number(rangeEnd) : null,
        }),

      if (!response.ok) {
        console.error("❌ 서버 응답 실패:", response.status);
        alert("서버 응답 실패: " + response.status);
        return;
      }

      const data = await response.json();
      console.log("✅ 크롤링 결과 수신 완료:", data);

      localStorage.setItem("result_hidden", JSON.stringify(data.hidden));
      localStorage.setItem("result_public", JSON.stringify(data.public));
      navigate("/result");
    } catch (error) {
      console.error("❌ 오류 발생:", error);
      alert("에러 발생: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📦 캠페인 필터링</h2>

      <label>PHPSESSID:</label><br />
      <input
        value={cookie}
        onChange={(e) => setCookie(e.target.value)}
        style={{ width: 300 }}
      /><br /><br />

      <label>참여 날짜 선택 (다중 가능):</label><br />
      <div style={{ display: "flex", flexWrap: "wrap", maxWidth: 500 }}>
        {days.map((d) => (
          <button
            key={d}
            onClick={() => toggleDay(d)}
            style={{
              margin: 4,
              background: selectedDays.includes(d) ? "#0077ff" : "#ddd",
              color: selectedDays.includes(d) ? "#fff" : "#000",
              borderRadius: 4,
              padding: "4px 8px",
              cursor: "pointer"
            }}
          >
            {d}
          </button>
        ))}
      </div><br />

      <label>제외 키워드 (쉼표로 구분):</label><br />
      <input
        value={exclude}
        onChange={(e) => setExclude(e.target.value)}
        style={{ width: 300 }}
        placeholder="이발기, 강아지, 깔창 등"
      /><br /><br />

      <label>캠페인 ID 범위 선택:</label><br />
      <label>
        <input
          type="radio"
          checked={useFullRange}
          onChange={() => setUseFullRange(true)}
        />
        전체 범위 자동 탐색
      </label><br />
      <label>
        <input
          type="radio"
          checked={!useFullRange}
          onChange={() => setUseFullRange(false)}
        />
        수동 범위 입력
      </label><br /><br />

      {!useFullRange && (
        <>
          <label>시작 캠페인 ID:</label><br />
          <input
            type="number"
            value={startId}
            onChange={(e) => setStartId(Number(e.target.value))}
          /><br /><br />
          <label>끝 캠페인 ID:</label><br />
          <input
            type="number"
            value={endId}
            onChange={(e) => setEndId(Number(e.target.value))}
          /><br /><br />
        </>
      )}

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "⏳ 실행 중..." : "✅ 실행하기"}
      </button>

      {localStorage.getItem("result_hidden") && localStorage.getItem("result_public") && (
        <button onClick={() => navigate("/result")} style={{ marginBottom: 20 }}>
          📄 결과 다시 보기
        </button>
      )}

      {loading && (
        <div style={{ marginTop: 10 }}>
          <p style={{ color: "green" }}>⏳ 데이터를 불러오는 중입니다...</p>
          <div style={{
            height: 10,
            width: "100%",
            backgroundColor: "#eee",
            borderRadius: 5,
            overflow: "hidden",
            marginTop: 5
          }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: "#0077ff",
              transition: "width 0.3s ease"
            }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
