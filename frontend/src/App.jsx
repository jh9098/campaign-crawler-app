import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function App() {
  const [cookie, setCookie] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [exclude, setExclude] = useState("");
  const navigate = useNavigate();

  const days = Array.from({ length: 31 }, (_, i) => `${String(i + 1).padStart(2, "0")}일`);

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    const response = await fetch("https://your-api-server.com/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_cookie: cookie,
        selected_days: selectedDays,
        exclude_keywords: exclude.split(",").map((kw) => kw.trim()),
      }),
    });
    const data = await response.json();
    localStorage.setItem("result_hidden", JSON.stringify(data.hidden));
    localStorage.setItem("result_public", JSON.stringify(data.public));
    navigate("/result");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📦 캠페인 필터링</h2>
      <label>PHPSESSID:</label>
      <input value={cookie} onChange={(e) => setCookie(e.target.value)} style={{ width: 300 }} /><br /><br />

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

      <button onClick={handleSubmit}>✅ 실행하기</button>
    </div>
  );
}
