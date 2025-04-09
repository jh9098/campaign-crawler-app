import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Result() {
  const navigate = useNavigate();
  const [hiddenResults, setHiddenResults] = useState([]);
  const [publicResults, setPublicResults] = useState([]);
  const [filter, setFilter] = useState({ hidden: "", public: "" });

  const handleFileUpload = (event, isHidden) => {
    const files = Array.from(event.target.files);
    const readerPromises = files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsText(file);
        })
    );

    Promise.all(readerPromises).then((contents) => {
      const merged = contents
        .flatMap((text) => text.split("\n"))
        .filter((line) => line.trim() !== "")
        .sort((a, b) => {
          const timeA = a.split(" & ")[5];
          const timeB = b.split(" & ")[5];
          return timeA.localeCompare(timeB);
        });
      if (isHidden) setHiddenResults(merged);
      else setPublicResults(merged);
    });
  };

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

    return (
      <div style={{ marginBottom: 40 }}>
        <h3>
          {title} ({filtered.length}건)
          <button
            onClick={() => downloadTxt(filtered, isHidden ? "숨김캠페인.txt" : "공개캠페인.txt")}
            style={{ marginLeft: 12, padding: "4px 10px", fontSize: 14 }}
          >
            📥 다운로드
          </button>
        </h3>

        <input
          type="text"
          placeholder="🔎 필터링할 키워드를 입력하세요"
          value={isHidden ? filter.hidden : filter.public}
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, [isHidden ? "hidden" : "public"]: e.target.value }))
          }
          style={{ marginBottom: 10, width: 300 }}
        />

        <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>No</th><th>구분</th><th>리뷰</th><th>쇼핑몰</th><th>가격</th>
              <th>포인트</th><th>시간</th><th>상품명</th><th>링크</th><th>번호</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => {
              const [type, review, mall, price, point, time, name, url] = row.split(" & ");
              const match = url.match(/csq=(\d+)/);
              const csq = match ? match[1] : "-";
              return (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{type}</td><td>{review}</td><td>{mall}</td><td>{price}</td>
                  <td>{point}</td><td>{time}</td><td>{name}</td>
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
      <h2>🧾 크롤링 결과 업로드 보기</h2>
      <button onClick={() => navigate("/")}>🔙 처음으로</button><br /><br />

      <label>🔒 숨겨진 캠페인 파일 업로드 (.txt 여러 개 가능):</label><br />
      <input type="file" multiple accept=".txt" onChange={(e) => handleFileUpload(e, true)} /><br /><br />

      <label>🌐 공개 캠페인 파일 업로드 (.txt 여러 개 가능):</label><br />
      <input type="file" multiple accept=".txt" onChange={(e) => handleFileUpload(e, false)} /><br /><br />

      {renderTable(hiddenResults, "🔒 숨겨진 캠페인", true)}
      {renderTable(publicResults, "🌐 공개 캠페인", false)}
    </div>
  );
}
