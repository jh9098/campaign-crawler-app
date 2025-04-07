import { useEffect, useState } from "react";

export default function Result() {
  const [hidden, setHidden] = useState([]);
  const [publics, setPublics] = useState([]);

  useEffect(() => {
    setHidden(JSON.parse(localStorage.getItem("result_hidden") || "[]"));
    setPublics(JSON.parse(localStorage.getItem("result_public") || "[]"));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>📌 히든 캠페인</h2>
      <ul>{hidden.map((line, i) => <li key={i}>{line}</li>)}</ul>
      <hr />
      <h2>📣 공개 캠페인</h2>
      <ul>{publics.map((line, i) => <li key={i}>{line}</li>)}</ul>
    </div>
  );
}
