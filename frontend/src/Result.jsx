// ✅ frontend/src/Result.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Result() {
  const [hidden, setHidden] = useState([]);
  const [publicCampaigns, setPublicCampaigns] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const hiddenData = JSON.parse(localStorage.getItem("result_hidden"));
    const publicData = JSON.parse(localStorage.getItem("result_public"));

    if (!hiddenData || !publicData) {
      alert("결과 데이터가 없습니다. 처음 화면으로 이동합니다.");
      navigate("/");
    } else {
      setHidden(hiddenData);
      setPublicCampaigns(publicData);
    }
  }, [navigate]);

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 필터링 결과</h2>

      <h3>🙈 비공개 캠페인</h3>
      {hidden.length === 0 ? (
        <p>없음</p>
      ) : (
        <ul>
          {hidden.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}

      <h3>🌐 공개 캠페인</h3>
      {publicCampaigns.length === 0 ? (
        <p>없음</p>
      ) : (
        <ul>
          {publicCampaigns.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}

      <button onClick={() => navigate("/")} style={{ marginTop: 20 }}>
        🔙 돌아가기
      </button>
    </div>
  );
}
