import { useState, useEffect, useRef } from "react";
import {
  uploadDocument, getExamQuestions, askQuestion,
  getSummary, getVivaQuestion, evaluateVivaAnswer
} from "./api";

// ── Google Fonts injected at runtime ─────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap";
document.head.appendChild(fontLink);

const MODES = [
  { id: "ask",     icon: "◈", label: "Ask Anything",      color: "#4ADE80", desc: "Get instant answers from your notes" },
  { id: "exam",    icon: "◉", label: "Exam Questions",     color: "#FB923C", desc: "Generate 10-mark university questions" },
  { id: "summary", icon: "◎", label: "Revision Summary",   color: "#38BDF8", desc: "Crisp cheat-sheet for any topic" },
  { id: "viva",    icon: "◐", label: "Viva Practice",      color: "#F472B6", desc: "Live oral exam simulation" },
];

const GREETINGS = ["Hey there,", "Welcome back,", "Ready to ace it,", "Let's study,", "Good to see you,"];

// ── Floating particle background ─────────────────────
function Particles() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {[...Array(18)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: i % 3 === 0 ? "2px" : "1px",
          height: i % 3 === 0 ? "2px" : "1px",
          background: ["#4ADE80", "#38BDF8", "#F472B6", "#FB923C"][i % 4],
          borderRadius: "50%",
          left: `${(i * 17 + 5) % 100}%`,
          top: `${(i * 23 + 10) % 100}%`,
          opacity: 0.4,
          animation: `float${i % 3} ${8 + (i % 5) * 2}s ease-in-out infinite`,
          animationDelay: `${i * 0.7}s`,
        }} />
      ))}
      <style>{`
        @keyframes float0 { 0%,100%{transform:translateY(0px) translateX(0px)} 50%{transform:translateY(-30px) translateX(15px)} }
        @keyframes float1 { 0%,100%{transform:translateY(0px) translateX(0px)} 50%{transform:translateY(20px) translateX(-20px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0px) translateX(0px)} 33%{transform:translateY(-15px) translateX(10px)} 66%{transform:translateY(10px) translateX(-15px)} }
      `}</style>
    </div>
  );
}

// ── Homepage ──────────────────────────────────────────
function HomePage({ onStart }) {
  const [greeting] = useState(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const [visible, setVisible] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative" }}>
      <Particles />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 700, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 100, padding: "6px 16px", marginBottom: 32 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", animation: "pulse 2s infinite" }} />
          <span style={{ color: "#4ADE80", fontSize: 11, letterSpacing: 2, fontWeight: 600 }}>AI-POWERED EXAM ASSISTANT</span>
        </div>

        {/* Greeting */}
        <div style={{ color: "#64748B", fontSize: "clamp(16px, 2vw, 20px)", fontFamily: "'DM Sans', sans-serif", marginBottom: 8, fontStyle: "italic" }}>
          {greeting}
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(40px, 7vw, 80px)",
          fontWeight: 800,
          lineHeight: 1.0,
          margin: "0 0 24px",
          letterSpacing: "-2px",
        }}>
          <span style={{ color: "#F1F5F9" }}>Study</span>
          <span style={{ color: "#4ADE80" }}>Buddy</span>
        </h1>

        {/* Subtitle */}
        <p style={{ color: "#94A3B8", fontSize: "clamp(14px, 2vw, 18px)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 48px", fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
          Upload your notes, syllabus or PYQs — and get instant explanations, exam questions, revision summaries and viva practice. <em style={{ color: "#F1F5F9" }}>All from your own material.</em>
        </p>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
          {["RAG-powered answers", "10-mark question gen", "Viva simulator", "Smart summaries"].map((f, i) => (
            <span key={f} style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#94A3B8", fontSize: 12,
              padding: "6px 14px", borderRadius: 100,
              fontFamily: "'DM Sans', sans-serif",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(10px)",
              transition: `all 0.5s ease ${0.3 + i * 0.1}s`
            }}>{f}</span>
          ))}
        </div>

        {/* CTA */}
        <button onClick={onStart} style={{
          background: "#4ADE80",
          color: "#0A0F1A",
          border: "none",
          padding: "16px 48px",
          borderRadius: 100,
          fontSize: 16,
          fontWeight: 700,
          fontFamily: "'Syne', sans-serif",
          cursor: "pointer",
          letterSpacing: 0.5,
          boxShadow: "0 0 40px rgba(74,222,128,0.3)",
          transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.target.style.transform = "scale(1.05)"; e.target.style.boxShadow = "0 0 60px rgba(74,222,128,0.5)"; }}
          onMouseLeave={e => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 0 40px rgba(74,222,128,0.3)"; }}
        >
          Start Studying →
        </button>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 40, justifyContent: "center", marginTop: 64, opacity: 0.5 }}>
          {[["4", "AI Modes"], ["RAG", "Pipeline"], ["0$", "To Start"]].map(([val, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: "#F1F5F9" }}>{val}</div>
              <div style={{ fontSize: 11, color: "#64748B", letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────
function StudyApp() {
  const [uploaded, setUploaded]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docInfo, setDocInfo]     = useState(null);
  const [mode, setMode]           = useState("ask");
  const [query, setQuery]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const [vivaQ, setVivaQ]         = useState("");
  const [vivaA, setVivaA]         = useState("");
  const [vivaPhase, setVivaPhase] = useState("idle");
  const [vivaFeedback, setVivaFeedback] = useState("");
  const [prevQs, setPrevQs]       = useState([]);
  const [vivaTopic, setVivaTopic] = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const resultRef = useRef(null);

  const currentMode = MODES.find(m => m.id === mode);

  const processFile = async (file) => {
    if (!file || !file.name.endsWith(".pdf")) {
      setError("Please upload a PDF file."); return;
    }
    setUploading(true); setError("");
    try {
      const data = await uploadDocument(file);
      setDocInfo(data); setUploaded(true);
    } catch {
      setError("Upload failed. Is the backend running? (uvicorn main:app --reload)");
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true); setResult(null); setError("");
    try {
      if (mode === "ask") {
        const d = await askQuestion(query);
        setResult({ type: "answer", ...d });
      } else if (mode === "exam") {
        const d = await getExamQuestions(query);
        setResult({ type: "exam", ...d });
      } else if (mode === "summary") {
        const d = await getSummary(query);
        setResult({ type: "summary", ...d });
      } else if (mode === "viva") {
        setVivaTopic(query);
        const d = await getVivaQuestion(query, prevQs);
        setVivaQ(d.question); setVivaPhase("question"); setResult(null);
      }
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong.");
    }
    setLoading(false);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleVivaSubmit = async () => {
    if (!vivaA.trim()) return;
    setLoading(true);
    try {
      const d = await evaluateVivaAnswer(vivaQ, vivaA);
      setVivaFeedback(d.feedback);
      setPrevQs(p => [...p, vivaQ]);
      setVivaPhase("feedback");
    } catch { setError("Evaluation failed."); }
    setLoading(false);
  };

  const resetMode = (m) => {
    setMode(m); setResult(null); setError(""); setQuery("");
    setVivaPhase("idle"); setVivaQ(""); setVivaA(""); setVivaFeedback("");
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <Particles />

      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(20px)", background: "rgba(10,15,26,0.8)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20 }}>
            <span style={{ color: "#F1F5F9" }}>Study</span><span style={{ color: "#4ADE80" }}>Buddy</span>
          </span>
        </div>
        {uploaded && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 100, padding: "5px 14px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80" }} />
            <span style={{ color: "#4ADE80", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{docInfo?.filename}</span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px", position: "relative", zIndex: 1 }}>

        {/* Upload section */}
        {!uploaded ? (
          <div style={{ marginBottom: 40 }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#F1F5F9", margin: "0 0 8px" }}>Upload your material</h2>
              <p style={{ color: "#64748B", fontSize: 14, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Notes, syllabus, textbook chapters, or previous year questions</p>
            </div>

            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
              style={{
                display: "block", cursor: "pointer",
                border: `2px dashed ${dragOver ? "#4ADE80" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 16, padding: "60px 40px", textAlign: "center",
                background: dragOver ? "rgba(74,222,128,0.05)" : "rgba(255,255,255,0.02)",
                transition: "all 0.2s",
              }}>
              <input type="file" accept=".pdf" onChange={e => processFile(e.target.files[0])} style={{ display: "none" }} disabled={uploading} />
              {uploading ? (
                <div>
                  <div style={{ width: 40, height: 40, border: "3px solid rgba(74,222,128,0.2)", borderTop: "3px solid #4ADE80", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                  <div style={{ color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>Processing PDF — extracting, chunking, embedding...</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                  <div style={{ color: "#F1F5F9", fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Drop your PDF here</div>
                  <div style={{ color: "#64748B", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>or click to browse • PDF only</div>
                </div>
              )}
            </label>
            {error && <div style={{ marginTop: 12, color: "#F87171", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 16px" }}>⚠ {error}</div>}
          </div>
        ) : (
          /* Doc info card */
          <div style={{ marginBottom: 32, background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 32 }}>✅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, color: "#4ADE80", fontSize: 15 }}>{docInfo?.filename}</div>
              <div style={{ color: "#64748B", fontSize: 13, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                {docInfo?.chunks_created} chunks indexed · {docInfo?.topics_found?.length} topics found
              </div>
              {docInfo?.topics_found?.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {docInfo.topics_found.map(t => (
                    <span key={t} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94A3B8", fontSize: 11, padding: "2px 10px", borderRadius: 100, fontFamily: "'DM Sans', sans-serif" }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
            <label style={{ cursor: "pointer", color: "#64748B", fontSize: 12, fontFamily: "'DM Sans', sans-serif", border: "1px solid rgba(255,255,255,0.08)", padding: "6px 14px", borderRadius: 8 }}>
              <input type="file" accept=".pdf" onChange={e => { setUploaded(false); processFile(e.target.files[0]); }} style={{ display: "none" }} />
              Change file
            </label>
          </div>
        )}

        {/* Mode selector */}
        {uploaded && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ color: "#64748B", fontSize: 11, letterSpacing: 2, fontFamily: "'DM Sans', sans-serif", marginBottom: 14 }}>SELECT MODE</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {MODES.map(m => (
                <button key={m.id} onClick={() => resetMode(m.id)} style={{
                  background: mode === m.id ? `${m.color}12` : "rgba(255,255,255,0.02)",
                  border: `1.5px solid ${mode === m.id ? m.color : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                  textAlign: "left", transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: 20, color: m.color, marginBottom: 6 }}>{m.icon}</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 13, color: mode === m.id ? m.color : "#F1F5F9", marginBottom: 3 }}>{m.label}</div>
                  <div style={{ color: "#475569", fontSize: 11, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Query input */}
        {uploaded && vivaPhase === "idle" && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                style={{
                  flex: 1, background: "rgba(255,255,255,0.03)",
                  border: "1.5px solid rgba(255,255,255,0.08)",
                  color: "#F1F5F9", borderRadius: 12, padding: "14px 18px",
                  fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                  outline: "none", transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = currentMode.color}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                placeholder={mode === "ask" ? "Ask anything from your notes..." : mode === "exam" ? "Enter topic e.g. Recursion, Unit 3..." : mode === "summary" ? "Enter topic to summarize..." : "Enter topic for viva practice..."}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
              <button onClick={handleSubmit} disabled={loading || !query.trim()} style={{
                background: currentMode.color, color: "#0A0F1A",
                border: "none", borderRadius: 12, padding: "14px 24px",
                fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
                cursor: "pointer", whiteSpace: "nowrap",
                opacity: loading || !query.trim() ? 0.5 : 1,
                transition: "all 0.2s",
              }}>
                {loading ? "..." : mode === "viva" ? "Start →" : "Go →"}
              </button>
            </div>
          </div>
        )}

        {/* Viva: question phase */}
        {uploaded && vivaPhase === "question" && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ background: "rgba(244,114,182,0.05)", border: "1.5px solid rgba(244,114,182,0.2)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <div style={{ color: "#F472B6", fontSize: 11, letterSpacing: 2, fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>🎓 PROFESSOR ASKS</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 600, color: "#F1F5F9", lineHeight: 1.5 }}>{vivaQ}</div>
            </div>
            <textarea
              style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)", color: "#F1F5F9", borderRadius: 12, padding: "14px 18px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", boxSizing: "border-box", minHeight: 100 }}
              placeholder="Type your answer..."
              value={vivaA}
              onChange={e => setVivaA(e.target.value)}
              rows={4}
            />
            <button onClick={handleVivaSubmit} disabled={loading || !vivaA.trim()} style={{ marginTop: 10, background: "#F472B6", color: "#0A0F1A", border: "none", borderRadius: 12, padding: "12px 28px", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: loading || !vivaA.trim() ? 0.5 : 1 }}>
              {loading ? "Evaluating..." : "Submit Answer →"}
            </button>
          </div>
        )}

        {/* Viva: feedback phase */}
        {uploaded && vivaPhase === "feedback" && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ background: "rgba(74,222,128,0.04)", border: "1.5px solid rgba(74,222,128,0.15)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <div style={{ color: "#4ADE80", fontSize: 11, letterSpacing: 2, fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>📊 PROFESSOR'S FEEDBACK</div>
              <pre style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#CBD5E1", whiteSpace: "pre-wrap", lineHeight: 1.8, margin: 0 }}>{vivaFeedback}</pre>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={async () => { setLoading(true); setVivaA(""); setVivaFeedback(""); setVivaPhase("question"); try { const d = await getVivaQuestion(vivaTopic, prevQs); setVivaQ(d.question); } catch {} setLoading(false); }} style={{ background: "#F472B6", color: "#0A0F1A", border: "none", borderRadius: 12, padding: "12px 24px", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {loading ? "Loading..." : "Next Question →"}
              </button>
              <button onClick={() => { setVivaPhase("idle"); setQuery(""); setPrevQs([]); setResult(null); }} style={{ background: "transparent", border: "1.5px solid rgba(255,255,255,0.1)", color: "#64748B", borderRadius: 12, padding: "12px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: "pointer" }}>
                End Viva
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 20, color: "#F87171", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "12px 16px" }}>⚠ {error}</div>
        )}

        {/* Result */}
        {result && (
          <div ref={resultRef} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 28, animation: "fadeUp 0.4s ease" }}>

            {result.type === "answer" && (
              <>
                <div style={{ display: "inline-block", background: "rgba(74,222,128,0.1)", color: "#4ADE80", fontSize: 10, letterSpacing: 2, padding: "4px 12px", borderRadius: 100, marginBottom: 16, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>ANSWER</div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#CBD5E1", lineHeight: 1.8, margin: "0 0 16px" }}>{result.answer}</p>
                {result.sources?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ color: "#475569", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>Sources:</span>
                    {result.sources.map(s => (
                      <span key={s.source_number} style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.15)", color: "#38BDF8", fontSize: 11, padding: "2px 10px", borderRadius: 100, fontFamily: "'DM Sans', sans-serif" }}>📌 {s.topic}</span>
                    ))}
                  </div>
                )}
              </>
            )}

            {result.type === "exam" && (
              <>
                <div style={{ display: "inline-block", background: "rgba(251,146,60,0.1)", color: "#FB923C", fontSize: 10, letterSpacing: 2, padding: "4px 12px", borderRadius: 100, marginBottom: 16, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>EXAM QUESTIONS</div>
                <pre style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#CBD5E1", whiteSpace: "pre-wrap", lineHeight: 1.9, margin: 0 }}>{result.questions}</pre>
              </>
            )}

            {result.type === "summary" && (
              <>
                <div style={{ display: "inline-block", background: "rgba(56,189,248,0.1)", color: "#38BDF8", fontSize: 10, letterSpacing: 2, padding: "4px 12px", borderRadius: 100, marginBottom: 16, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>REVISION SUMMARY</div>
                <pre style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#CBD5E1", whiteSpace: "pre-wrap", lineHeight: 1.9, margin: 0 }}>{result.summary}</pre>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

// ── Root: handles page routing ────────────────────────
export default function App() {
  const [page, setPage] = useState("home");

  return (
    <div style={{
      background: "#0A0F1A",
      minHeight: "100vh",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {page === "home"
        ? <HomePage onStart={() => setPage("app")} />
        : <StudyApp />
      }
    </div>
  );
}