import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function App() {
  const [cookie, setCookie] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [exclude, setExclude] = useState("");
  const [loading, setLoading] = useState(false);
  const [useFullRange, setUseFullRange] = useState(true);
  const [startId, setStartId] = useState(40000);
  const [endId, setEndId] = useState(40100);
  const navigate = useNavigate();

  const days = Array.from({ length: 31 }, (_, i) =>
    `${String(i + 1).padStart(2, "0")}일`
  );

  useEffect(() => {
    const savedCookie = localStorage.getItem("last_cookie");
    const savedDays = JSON.parse(localStorage.getItem("last_days") || "[]");
    const savedExclude = localStorage.getItem("last_exclude");
    const savedUseFullRange =
      localStorage.getItem("last_use_full_range") === "true";
    const savedStartId = localStorage.getItem("last_start_id");
    const savedEndId = localStorage.getItem("last_end_id");

    if (savedCookie) setCookie(savedCookie);
    if (savedDays.length > 0) setSelectedDays(savedDays);
    if (savedExclude) setExclude(savedExclude);
    if (savedStartId) setStartId(Number(savedStartId));
    if (savedEndId) setEndId(Number(savedEndId));
    setUseFullRange(savedUseFullRange);
  }, []);

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = () => {
    if (!cookie) {
      alert("PHPSESSID를 입력해주세요.");
      return;
    }

    if (selectedDays.length === 0) {
      alert("참여 날짜를 하나 이상 선택해주세요.");
      return;
    }

    if (!useFullRange && startId >= endId) {
      alert("시작 ID가 끝 ID보다 작아야 합니다.");
      return;
    }

    setLoading(true);

    localStorage.setItem("last_cookie", cookie);
    localStorage.setItem("last_days", JSON.stringify(selectedDays));
    localStorage.setItem("last_exclude", exclude);
    localStorage.setItem("last_use_full_range", String(useFullRange));
    localStorage.setItem("last_start_id", String(startId));
    localStorage.setItem("last_end_id", String(endId));

    const query = new URLSearchParams({
      session_cookie: cookie,
      selected_days: selectedDays.join(","),
      exclude_keywords: exclude,
      use_full_range: useFullRange.toString(),
    });

    if (!useFullRange) {
      query.append("start_id", startId.toString());
      query.append("end_id", endId.toString());
    }

    navigate(`/result?${query.toString()}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📦 캠페인 필터링</h2>

      <label>PHPSESSID:</label>
      <br />
      <input
        value={cookie}
        onChange={(e) => setCookie(e.target.value)}
        style={{ width: 300 }}
      />
      <br />
      <br />

      <label>참여 날짜 선택 (다중 가능):</label>
      <br />
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
              cursor: "pointer",
            }}
          >
            {d}
          </button>
        ))}
      </div>
      <br />

      <label>제외 키워드 (쉼표로 구분):</label>
      <br />
      <input
        value={exclude}
        onChange={(e) => setExclude(e.target.value)}
        style={{ width: 300 }}
        placeholder="이발기, 강아지, 깔창 등"
      />
      <br />
      <br />

      <label>캠페인 ID 범위 선택:</label>
      <br />
      <label>
        <input
          type="radio"
          checked={useFullRange}
          onChange={() => setUseFullRange(true)}
        />
        전체 범위 자동 탐색
      </label>
      <br />
      <label>
        <input
          type="radio"
          checked={!useFullRange}
          onChange={() => setUseFullRange(false)}
        />
        수동 범위 입력
      </label>
      <br />
      <br />

      {!useFullRange && (
        <>
          <label>시작 캠페인 ID:</label>
          <br />
          <input
            type="number"
            value={startId}
            onChange={(e) => setStartId(Number(e.target.value))}
          />
          <br />
          <br />
          <label>끝 캠페인 ID:</label>
          <br />
          <input
            type="number"
            value={endId}
            onChange={(e) => setEndId(Number(e.target.value))}
          />
          <br />
          <br />
        </>
      )}

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "⏳ 실행 중..." : "✅ 실시간 실행"}
      </button>

      <button onClick={() => navigate("/result")} style={{ marginLeft: 10 }}>
        📄 업로드 결과 보기
      </button>

      {loading && (
        <div style={{ marginTop: 10 }}>
          <p style={{ color: "green" }}>⏳ 페이지 이동 중...</p>
        </div>
      )}
    </div>
  );
}
