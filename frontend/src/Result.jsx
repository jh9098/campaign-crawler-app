import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Result() {
  const navigate = useNavigate();
  const [hiddenResults, setHiddenResults] = useState([]);
  const [publicResults, setPublicResults] = useState([]);

  useEffect(() => {
    const hidden = JSON.parse(localStorage.getItem("result_hidden") || "[]");
    const publicData = JSON.parse(localStorage.getItem("result_public") || "[]");

    const sortByTime = (arr) => {
      return [...arr].sort((a, b) => {
        const timeA = a.split(" & ")[5];
        const timeB = b.split(" & ")[5];
        return timeA.localeCompare(timeB);
      });
    };

    setHiddenResults(sortByTime(hidden));
    setPublicResults(sortByTime(publicData));
  }, []);

  const renderTable = (data, title) => (
    <div style={{ marginBottom: 40 }}>
      <h3>{title} ({data.length}건)</h3>
      <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>구분</th><th>리뷰</th><th>쇼핑몰</th><th>가격</th>
            <th>포인트</th><th>시간</th><th>상품명</th><th>링크</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const [type, review, mall, price, point, time, name, url] = row.split(" & ");
            return (
              <tr key={idx}>
                <td>{type}</td><td>{review}</td><td>{mall}</td><td>{price}</td>
                <td>{point}</td><td>{time}</td><td>{name}</td>
                <td>
                  <a href={url} target="_blank" rel="noreferrer">바로가기</a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>🧾 크롤링 결과</h2>
      <button onClick={() => navigate("/")}>🔙 처음으로</button>
      <br /><br />
      {renderTable(hiddenResults, "🔒 숨겨진 캠페인")}
      {renderTable(publicResults, "🌐 공개 캠페인")}
    </div>
  );
}
