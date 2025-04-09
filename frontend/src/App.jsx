// ✅ App.jsx (실행 버튼 누르면 txt 자동 다운로드)
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function App() {
  const [cookie, setCookie] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [exclude, setExclude] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    if (!cookie) return alert("PHPSESSID를 입력해주세요.");
    if (selectedDays.length === 0) return alert("참여 날짜를 하나 이상 선택해주세요.");

    setLoading(true);
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
        }),
      });

      if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
      const text = await response.text();

      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "campaign_result.txt";
      a.click();
      URL.revokeObjectURL(url);

      alert("✅ 파일 다운로드가 완료되었습니다. 결과보기 메뉴에서 업로드해주세요.");
      navigate("/result");
    } catch (err) {
      console.error("❌ 오류 발생:", err);
      alert("에러 발생: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📦 캠페인 필터링</h2>

      <label>PHPSESSID:</label><br />
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
            }}>
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

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "⏳ 실행 중..." : "✅ 실행하기"}
      </button>
    </div>
  );
}
