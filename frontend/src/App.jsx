import { useState, useEffect, useRef } from "react";

const API = "http://127.0.0.1:8000/api";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const token = () => localStorage.getItem("ala_token");

async function apiFetch(path, opts = {}) {
  try {
    const headers = { Authorization: `Bearer ${token()}` };
    if (!(opts.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { ...headers, ...(opts.headers || {}) },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg =
        typeof err.detail === "string"
          ? err.detail
          : Array.isArray(err.detail)
          ? err.detail[0]?.msg || "Validation error"
          : "Request failed";
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    return res.json();
  } catch (e) {
    throw e;
  }
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── DESIGN SYSTEM ───────────────────────────────────────────────────────────
const DS = {
  bg: "#0D0F1A", bgCard: "#141828", bgPanel: "#1A1F35", border: "#252B45",
  primary: "#6C63FF", accent: "#00E5CC", warn: "#FFB547", danger: "#FF5C7A",
  success: "#4ADE80", textPrimary: "#F0F2FF", textSecondary: "#8892B0",
  textMuted: "#4A5578",
  gradPrimary: "linear-gradient(135deg, #6C63FF 0%, #9D50BB 100%)",
  gradAccent: "linear-gradient(135deg, #00E5CC 0%, #0099FF 100%)",
  shadow: "0 4px 24px rgba(0,0,0,0.5)",
  shadowGlow: "0 0 20px rgba(108,99,255,0.3)",
  radius: "12px", radiusSm: "8px", radiusLg: "20px",
  font: "'Inter','Segoe UI',system-ui,sans-serif",
  fontMono: "'JetBrains Mono','Fira Code',monospace",
};

// ─── MICRO COMPONENTS ────────────────────────────────────────────────────────
function Spinner({ size = 24, color = DS.primary }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      style={{ animation: "spin 1s linear infinite" }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" fill="none"
        strokeDasharray="31" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  );
}

function Badge({ label, color = DS.primary }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      background: `${color}22`, color, border: `1px solid ${color}44`,
      fontFamily: DS.font,
    }}>{label}</span>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", disabled, style: sx }) {
  const sizes = {
    sm: { fontSize: 13, padding: "6px 14px" },
    md: { fontSize: 14, padding: "9px 20px" },
    lg: { fontSize: 16, padding: "12px 28px" },
  };
  const variants = {
    primary: { background: DS.gradPrimary, color: "#fff", border: "none", boxShadow: `0 2px 12px ${DS.primary}44` },
    accent:  { background: DS.gradAccent, color: "#000", border: "none" },
    ghost:   { background: "transparent", color: DS.textSecondary, border: `1px solid ${DS.border}` },
    danger:  { background: `${DS.danger}22`, color: DS.danger, border: `1px solid ${DS.danger}44` },
    outline: { background: "transparent", color: DS.primary, border: `1px solid ${DS.primary}` },
  };
  return (
    <button onClick={disabled ? undefined : onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: DS.font, fontWeight: 600, borderRadius: DS.radiusSm,
        transition: "all 0.18s", opacity: disabled ? 0.5 : 1,
        ...sizes[size], ...variants[variant], ...sx,
      }}>{children}</button>
  );
}

function Card({ children, style: sx, glow }) {
  return (
    <div style={{
      background: DS.bgCard, border: `1px solid ${DS.border}`,
      borderRadius: DS.radius, padding: 20,
      boxShadow: glow ? DS.shadowGlow : DS.shadow, ...sx,
    }}>{children}</div>
  );
}

function Input({ label, type = "text", value, onChange, placeholder, style: sx }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: DS.textSecondary, fontFamily: DS.font }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: DS.bgPanel, border: `1px solid ${DS.border}`,
          borderRadius: DS.radiusSm, color: DS.textPrimary, fontFamily: DS.font,
          fontSize: 14, padding: "10px 14px", outline: "none", width: "100%",
          boxSizing: "border-box", ...sx,
        }} />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: DS.textSecondary, fontFamily: DS.font }}>{label}</label>}
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{
          background: DS.bgPanel, border: `1px solid ${DS.border}`,
          borderRadius: DS.radiusSm, color: DS.textPrimary, fontFamily: DS.font,
          fontSize: 14, padding: "10px 14px", resize: "vertical", outline: "none",
          width: "100%", boxSizing: "border-box",
        }} />
    </div>
  );
}

function ProgressBar({ value, max = 100, color = DS.primary }) {
  const w = Math.min(100, max ? (value / max) * 100 : 0);
  return (
    <div style={{ background: DS.bgPanel, borderRadius: 20, height: 8, overflow: "hidden" }}>
      <div style={{
        width: `${w}%`, height: "100%",
        background: DS.gradPrimary, borderRadius: 20, transition: "width 0.6s ease",
      }} />
    </div>
  );
}

function Toast({ message, type = "info", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const colors = { info: DS.primary, success: DS.success, error: DS.danger, warn: DS.warn };
  const icons = { info: "ℹ", success: "✓", error: "✕", warn: "⚠" };
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: DS.bgCard, border: `1px solid ${colors[type]}66`,
      borderRadius: DS.radius, padding: "12px 20px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: DS.shadow, fontFamily: DS.font, color: DS.textPrimary,
      fontSize: 14, maxWidth: 340,
    }}>
      <span style={{ color: colors[type], fontSize: 18 }}>{icons[type]}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: DS.textMuted, cursor: "pointer", fontSize: 16 }}>×</button>
    </div>
  );
}

function BarChart({ data, xKey, yKey }) {
  const max = Math.max(...data.map(d => d[yKey]), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: "100%", background: DS.gradPrimary, borderRadius: "4px 4px 0 0",
            height: `${(d[yKey] / max) * 70}px`, minHeight: d[yKey] > 0 ? 4 : 0,
            transition: "height 0.6s ease",
          }} />
          <span style={{ fontSize: 10, color: DS.textMuted, fontFamily: DS.font }}>{d[xKey]}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ value, max = 100, color = DS.primary, label }) {
  const r = 30, circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, max) / max) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={80} height={80} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke={DS.border} strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 40 40)" style={{ transition: "stroke-dashoffset 1s ease" }} />
        <text x="40" y="40" textAnchor="middle" dominantBaseline="middle"
          fill={DS.textPrimary} fontSize="14" fontWeight="700" fontFamily={DS.font}>
          {Math.round((value / max) * 100)}%
        </text>
      </svg>
      {label && <span style={{ fontSize: 12, color: DS.textMuted, fontFamily: DS.font }}>{label}</span>}
    </div>
  );
}

function DropZone({ accept, onFile, label, icon }) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef();
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0]); }}
      onClick={() => ref.current.click()}
      style={{
        border: `2px dashed ${dragging ? DS.primary : DS.border}`,
        borderRadius: DS.radius, padding: "32px 20px", textAlign: "center",
        cursor: "pointer", background: dragging ? `${DS.primary}11` : DS.bgPanel,
        transition: "all 0.2s",
      }}>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }}
        onChange={e => onFile(e.target.files[0])} />
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: DS.font, fontSize: 14, color: DS.textSecondary }}>{label}</div>
      <div style={{ fontFamily: DS.font, fontSize: 12, color: DS.textMuted, marginTop: 4 }}>or click to browse</div>
    </div>
  );
}

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit() {
    setError("");
    if (tab === "register" && form.password !== form.confirmPassword) {
      setError("Passwords do not match"); return;
    }
    setLoading(true);
    try {
      let data;
      if (tab === "register") {
        data = await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({ full_name: form.full_name, email: form.email, password: form.password, language: "en" }),
        });
      } else {
        data = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
      }
      if (data && data.access_token) {
        localStorage.setItem("ala_token", data.access_token);
        localStorage.setItem("ala_user", JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError("Unexpected response from server");
      }
    } catch (e) {
      setError(e.message || "Something went wrong");
    }
    setLoading(false);
  }

  async function handleForgot() {
    setLoading(true);
    await apiFetch(`/auth/forgot-password?email=${encodeURIComponent(forgotEmail)}`, { method: "POST" }).catch(() => {});
    setForgotSent(true);
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", background: DS.bg, display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: DS.font, padding: 20,
    }}>
      <style>{`*{box-sizing:border-box}body{margin:0}input::placeholder,textarea::placeholder{color:${DS.textMuted}}`}</style>
      <Card style={{ width: "100%", maxWidth: 440, padding: 36 }} glow>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎓</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: DS.textPrimary, margin: 0 }}>AI Learning Assistant</h1>
          <p style={{ color: DS.textMuted, fontSize: 14, margin: "6px 0 0" }}>Your intelligent study companion</p>
        </div>

        {forgotMode ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ color: DS.textPrimary, margin: 0 }}>Reset Password</h3>
            {forgotSent ? (
              <div style={{ color: DS.success, fontSize: 14, textAlign: "center", padding: 16 }}>
                ✓ If that email exists, a reset link has been sent.
              </div>
            ) : (
              <>
                <Input label="Email" type="email" value={forgotEmail} onChange={setForgotEmail} placeholder="your@email.com" />
                <Btn onClick={handleForgot} disabled={loading} size="lg" style={{ width: "100%", justifyContent: "center" }}>
                  {loading ? <Spinner size={16} /> : "Send Reset Link"}
                </Btn>
              </>
            )}
            <Btn variant="ghost" onClick={() => { setForgotMode(false); setForgotSent(false); }} style={{ width: "100%", justifyContent: "center" }}>
              Back to Login
            </Btn>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", marginBottom: 24, background: DS.bgPanel, borderRadius: DS.radiusSm, padding: 4 }}>
              {["login", "register"].map(t => (
                <button key={t} onClick={() => { setTab(t); setError(""); }}
                  style={{
                    flex: 1, padding: "8px 0", border: "none", borderRadius: DS.radiusSm,
                    background: tab === t ? DS.gradPrimary : "transparent",
                    color: tab === t ? "#fff" : DS.textMuted,
                    fontFamily: DS.font, fontWeight: 600, fontSize: 14, cursor: "pointer",
                  }}>
                  {t === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {tab === "register" && (
                <Input label="Full Name" value={form.full_name} onChange={set("full_name")} placeholder="Your full name" />
              )}
              <Input label="Email" type="email" value={form.email} onChange={set("email")} placeholder="your@email.com" />
              <Input label="Password" type="password" value={form.password} onChange={set("password")} placeholder="Min 8 characters" />
              {tab === "register" && (
                <Input label="Confirm Password" type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="Repeat password" />
              )}
              {error && (
                <div style={{ color: DS.danger, fontSize: 13, textAlign: "center", padding: "8px 12px", background: `${DS.danger}11`, borderRadius: DS.radiusSm }}>
                  {error}
                </div>
              )}
              <Btn onClick={handleSubmit} disabled={loading} size="lg" style={{ width: "100%", justifyContent: "center" }}>
                {loading ? <><Spinner size={16} /> Please wait...</> : tab === "login" ? "Sign In" : "Create Account"}
              </Btn>
              {tab === "login" && (
                <button onClick={() => setForgotMode(true)}
                  style={{ background: "none", border: "none", color: DS.primary, fontSize: 13, cursor: "pointer", fontFamily: DS.font, textAlign: "center" }}>
                  Forgot password?
                </button>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardPage({ user, onNav }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/progress/dashboard").then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}><Spinner size={40} /></div>;

  const stats = [
    { label: "Materials Uploaded", value: data?.total_uploads || 0, icon: "📄", color: DS.primary },
    { label: "Quizzes Taken", value: data?.total_quizzes || 0, icon: "🧠", color: DS.accent },
    { label: "Avg Quiz Score", value: `${data?.average_score || 0}%`, icon: "🎯", color: DS.warn },
    { label: "Day Streak", value: `${data?.streak || 0} 🔥`, icon: "⚡", color: DS.success },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{
        background: DS.gradPrimary, borderRadius: DS.radiusLg, padding: "28px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <h2 style={{ color: "#fff", margin: 0, fontSize: 22, fontWeight: 800 }}>
            Welcome back, {user?.full_name?.split(" ")[0]}! 👋
          </h2>
          <p style={{ color: "rgba(255,255,255,0.75)", margin: "6px 0 0", fontSize: 14 }}>
            Ready to learn something new today?
          </p>
        </div>
        <div style={{ fontSize: 48 }}>🎓</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 28, background: `${s.color}22`, padding: 10, borderRadius: DS.radiusSm }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: DS.fontMono }}>{s.value}</div>
              <div style={{ fontSize: 12, color: DS.textMuted }}>{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <h3 style={{ color: DS.textPrimary, margin: "0 0 16px", fontSize: 16 }}>Quick Actions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
          {[
            { label: "Upload PDF", icon: "📄", page: "upload" },
            { label: "Upload Video", icon: "🎥", page: "upload" },
            { label: "Upload Audio", icon: "🎙️", page: "upload" },
            { label: "Enter Text", icon: "✍️", page: "upload" },
            { label: "Take a Quiz", icon: "🧠", page: "quiz" },
            { label: "AI Tutor", icon: "🤖", page: "tutor" },
          ].map(a => (
            <button key={a.label} onClick={() => onNav(a.page)}
              style={{
                background: DS.bgCard, border: `1px solid ${DS.border}`,
                borderRadius: DS.radius, padding: 16, textAlign: "center",
                cursor: "pointer", fontFamily: DS.font, transition: "all 0.2s",
              }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: DS.textSecondary }}>{a.label}</div>
            </button>
          ))}
        </div>
      </div>

      {data?.weekly_activity && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <h4 style={{ margin: "0 0 16px", color: DS.textSecondary, fontSize: 14 }}>📈 Uploads This Week</h4>
            <BarChart data={data.weekly_activity} xKey="date" yKey="uploads" />
          </Card>
          <Card>
            <h4 style={{ margin: "0 0 16px", color: DS.textSecondary, fontSize: 14 }}>📊 Quiz Scores This Week</h4>
            <BarChart data={data.weekly_activity} xKey="date" yKey="score" />
          </Card>
        </div>
      )}

      {data?.recent_uploads?.length > 0 && (
        <div>
          <h3 style={{ color: DS.textPrimary, margin: "0 0 16px", fontSize: 16 }}>Recent Materials</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.recent_uploads.map(m => (
              <Card key={m.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px" }}>
                <span style={{ fontSize: 24 }}>{m.file_type === "pdf" ? "📄" : m.file_type === "video" ? "🎥" : m.file_type === "audio" ? "🎙️" : "📝"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: DS.textPrimary }}>{m.file_name}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {m.topics?.slice(0, 3).map(t => <Badge key={t} label={t} />)}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: DS.textMuted }}>{formatDate(m.upload_date)}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── UPLOAD PAGE ──────────────────────────────────────────────────────────────
function UploadPage({ onNav }) {
  const [mode, setMode] = useState("pdf");
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const modes = [
    { id: "pdf", label: "PDF", icon: "📄", accept: ".pdf" },
    { id: "video", label: "Video", icon: "🎥", accept: ".mp4,.mov,.avi" },
    { id: "audio", label: "Audio", icon: "🎙️", accept: ".mp3,.wav,.m4a" },
    { id: "text", label: "Text", icon: "✍️" },
  ];

  async function handleUpload() {
    setError(""); setLoading(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append("language", language);
      if (mode === "text") {
        if (!text.trim()) { setError("Please enter some text"); setLoading(false); return; }
        fd.append("text", text);
      } else {
        if (!file) { setError("Please select a file"); setLoading(false); return; }
        fd.append("file", file);
      }
      const data = await apiFetch("/materials/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      setResult(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h2 style={{ color: DS.textPrimary, margin: 0, fontSize: 22, fontWeight: 800 }}>📤 Upload Learning Material</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {modes.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setFile(null); setResult(null); setError(""); }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 18px",
              background: mode === m.id ? DS.gradPrimary : DS.bgCard,
              color: mode === m.id ? "#fff" : DS.textSecondary,
              border: `1px solid ${mode === m.id ? "transparent" : DS.border}`,
              borderRadius: DS.radiusSm, cursor: "pointer", fontFamily: DS.font,
              fontWeight: 600, fontSize: 14,
            }}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {mode !== "text" ? (
            <DropZone
              accept={modes.find(m => m.id === mode)?.accept}
              onFile={setFile}
              label={file ? `✓ ${file.name}` : `Drop your ${mode} file here`}
              icon={modes.find(m => m.id === mode)?.icon}
            />
          ) : (
            <Textarea label="Paste your notes or text" value={text} onChange={setText}
              placeholder="Paste lecture notes, textbook content here…" rows={8} />
          )}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: DS.textSecondary, display: "block", marginBottom: 6 }}>Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              style={{
                background: DS.bgPanel, border: `1px solid ${DS.border}`,
                borderRadius: DS.radiusSm, color: DS.textPrimary, fontFamily: DS.font,
                fontSize: 14, padding: "9px 14px", width: 200,
              }}>
              <option value="en">🇬🇧 English</option>
              <option value="hi">🇮🇳 Hindi</option>
              <option value="mr">🇮🇳 Marathi</option>
            </select>
          </div>
          {error && <div style={{ color: DS.danger, fontSize: 14, padding: "8px 12px", background: `${DS.danger}11`, borderRadius: DS.radiusSm }}>{error}</div>}
          <Btn onClick={handleUpload} disabled={loading} size="lg" style={{ width: 220 }}>
            {loading ? <><Spinner size={16} /> Processing…</> : "🚀 Process & Analyse"}
          </Btn>
        </div>
      </Card>

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <h3 style={{ color: DS.success, margin: 0 }}>✓ Analysis Complete!</h3>
          {result.topics?.length > 0 && (
            <Card>
              <h4 style={{ color: DS.textSecondary, margin: "0 0 12px", fontSize: 14 }}>🏷️ Topics Detected</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.topics.map(t => <Badge key={t} label={t} color={DS.primary} />)}
              </div>
            </Card>
          )}
          {result.summary && (
            <Card>
              <h4 style={{ color: DS.textSecondary, margin: "0 0 12px", fontSize: 14 }}>📋 Summary</h4>
              <p style={{ color: DS.textPrimary, fontSize: 14, lineHeight: 1.8, margin: 0 }}>{result.summary}</p>
            </Card>
          )}
          {result.notes?.length > 0 && (
            <Card>
              <h4 style={{ color: DS.textSecondary, margin: "0 0 12px", fontSize: 14 }}>📝 Smart Notes</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.notes.map((n, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, padding: "10px 14px",
                    background: DS.bgPanel, borderRadius: DS.radiusSm,
                    borderLeft: `3px solid ${DS.primary}`,
                  }}>
                    <span style={{ color: DS.primary, fontWeight: 700, fontFamily: DS.fontMono, fontSize: 13, minWidth: 20 }}>{i + 1}</span>
                    <span style={{ color: DS.textPrimary, fontSize: 14, lineHeight: 1.6 }}>{n}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <Btn variant="outline" size="sm" onClick={() => onNav("quiz", result.id)}>🧠 Generate Quiz</Btn>
                <Btn variant="outline" size="sm" onClick={() => onNav("flashcards", result.id)}>🃏 Flashcards</Btn>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MATERIALS PAGE ───────────────────────────────────────────────────────────
function MaterialsPage({ onNav }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    apiFetch("/materials/").then(setMaterials).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}><Spinner size={40} /></div>;

  const filtered = materials.filter(m =>
    m.file_name.toLowerCase().includes(search.toLowerCase()) ||
    m.topics?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ color: DS.textPrimary, margin: 0, fontSize: 22, fontWeight: 800 }}>📚 My Materials</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <Input value={search} onChange={setSearch} placeholder="🔍 Search…" style={{ width: 220 }} />
          <Btn onClick={() => onNav("upload")}>+ Upload</Btn>
        </div>
      </div>
      {filtered.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={{ color: DS.textMuted }}>No materials yet. Upload your first one!</div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
          {filtered.map(m => (
            <Card key={m.id} style={{ cursor: "pointer", border: `1px solid ${selected === m.id ? DS.primary : DS.border}` }}
              onClick={() => setSelected(selected === m.id ? null : m.id)}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: 28 }}>{m.file_type === "pdf" ? "📄" : m.file_type === "video" ? "🎥" : m.file_type === "audio" ? "🎙️" : "📝"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: DS.textPrimary, wordBreak: "break-word" }}>{m.file_name}</div>
                  <div style={{ fontSize: 12, color: DS.textMuted, marginTop: 4 }}>{formatDate(m.upload_date)}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {m.topics?.slice(0, 3).map(t => <Badge key={t} label={t} />)}
                  </div>
                </div>
              </div>
              {selected === m.id && (
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <Btn size="sm" onClick={() => onNav("quiz", m.id)}>🧠 Quiz</Btn>
                  <Btn size="sm" variant="outline" onClick={() => onNav("flashcards", m.id)}>🃏 Cards</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => onNav("tutor", m.id)}>🤖 Tutor</Btn>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── QUIZ PAGE ────────────────────────────────────────────────────────────────
function QuizPage({ materialId, onNav }) {
  const [materials, setMaterials] = useState([]);
  const [selId, setSelId] = useState(materialId || "");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => { apiFetch("/materials/").then(setMaterials).catch(() => {}); }, []);

  async function generateQuiz() {
    if (!selId) return;
    setLoading(true); setQuestions([]); setAnswers({}); setSubmitted(false); setScore(null);
    startTime.current = Date.now();
    try {
      const data = await apiFetch(`/quiz/generate/${selId}?n=10`);
      setQuestions(data.questions || []);
    } catch (e) { alert(e.message); }
    setLoading(false);
  }

  async function submitQuiz() {
    const timeSec = Math.round((Date.now() - startTime.current) / 1000);
    const payload = questions.map((q, i) => {
      const chosen = answers[i];
      const correctOpt = q.options?.find(o => o.is_correct);
      const isCorrect = chosen === correctOpt?.label;
      return { question_index: i, chosen_answer: chosen, is_correct: isCorrect };
    });
    try {
      const res = await apiFetch(`/quiz/submit/${selId}`, {
        method: "POST",
        body: JSON.stringify({ material_id: selId, answers: payload, time_taken_seconds: timeSec }),
      });
      setScore(res); setSubmitted(true);
    } catch (e) { alert(e.message); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h2 style={{ color: DS.textPrimary, margin: 0, fontSize: 22, fontWeight: 800 }}>🧠 Quiz Generator</h2>
      {!questions.length && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <select value={selId} onChange={e => setSelId(e.target.value)}
              style={{ background: DS.bgPanel, border: `1px solid ${DS.border}`, borderRadius: DS.radiusSm, color: DS.textPrimary, fontFamily: DS.font, fontSize: 14, padding: "10px 14px", maxWidth: 400 }}>
              <option value="">-- Choose a material --</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.file_name}</option>)}
            </select>
            <Btn onClick={generateQuiz} disabled={!selId || loading} size="lg" style={{ width: 200 }}>
              {loading ? <><Spinner size={16} /> Generating…</> : "Generate Quiz"}
            </Btn>
          </div>
        </Card>
      )}

      {submitted && score && (
        <Card glow style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>{score.percentage >= 70 ? "🏆" : "📚"}</div>
          <h2 style={{ color: score.percentage >= 70 ? DS.success : DS.warn, margin: "0 0 8px" }}>
            {score.score}/{score.total} ({score.percentage}%)
          </h2>
          <p style={{ color: DS.textMuted }}>{score.message}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <Btn onClick={() => { setQuestions([]); setSubmitted(false); }} size="lg">Try Again</Btn>
            <Btn variant="outline" onClick={() => onNav("progress")}>View Progress</Btn>
          </div>
        </Card>
      )}

      {questions.length > 0 && !submitted && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Badge label={`${Object.keys(answers).length}/${questions.length} answered`} color={DS.accent} />
            <Btn variant="ghost" size="sm" onClick={() => setQuestions([])}>← Back</Btn>
          </div>
          {questions.map((q, i) => (
            <Card key={i}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
                <span style={{ background: DS.gradPrimary, color: "#fff", borderRadius: DS.radiusSm, padding: "3px 10px", fontSize: 13, fontWeight: 700 }}>Q{i + 1}</span>
                <div style={{ fontSize: 15, fontWeight: 600, color: DS.textPrimary, lineHeight: 1.6 }}>{q.question}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options?.map(opt => {
                  const chosen = answers[i] === opt.label;
                  return (
                    <button key={opt.label} onClick={() => setAnswers(a => ({ ...a, [i]: opt.label }))}
                      style={{
                        textAlign: "left", padding: "10px 16px", borderRadius: DS.radiusSm,
                        background: chosen ? `${DS.primary}22` : DS.bgPanel,
                        border: `1px solid ${chosen ? DS.primary : DS.border}`,
                        color: chosen ? DS.primary : DS.textSecondary,
                        fontFamily: DS.font, fontSize: 14, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                      <span style={{ fontWeight: 700, minWidth: 20 }}>{opt.label}</span>{opt.text}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
          <Btn onClick={submitQuiz} disabled={Object.keys(answers).length < questions.length} size="lg" style={{ width: 200 }}>
            Submit Quiz ✓
          </Btn>
        </div>
      )}
    </div>
  );
}

// ─── FLASHCARDS PAGE ──────────────────────────────────────────────────────────
function FlashcardsPage({ materialId }) {
  const [materials, setMaterials] = useState([]);
  const [selId, setSelId] = useState(materialId || "");
  const [cards, setCards] = useState([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [known, setKnown] = useState(new Set());

  useEffect(() => { apiFetch("/materials/").then(setMaterials).catch(() => {}); }, []);

  async function generate() {
    if (!selId) return;
    setLoading(true); setCards([]); setCurrent(0); setFlipped(false); setKnown(new Set());
    try {
      const data = await apiFetch(`/flashcards/generate/${selId}?n=15`);
      setCards(data.cards || []);
    } catch (e) { alert(e.message); }
    setLoading(false);
  }

  const next = () => { setCurrent(c => Math.min(c + 1, cards.length - 1)); setFlipped(false); };
  const prev = () => { setCurrent(c => Math.max(c - 1, 0)); setFlipped(false); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h2 style={{ color: DS.textPrimary, margin: 0, fontSize: 22, fontWeight: 800 }}>🃏 Flashcards</h2>
      {!cards.length && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <select value={selId} onChange={e => setSelId(e.target.value)}
              style={{ background: DS.bgPanel, border: `1px solid ${DS.border}`, borderRadius: DS.radiusSm, color: DS.textPrimary, fontFamily: DS.font, fontSize: 14, padding: "10px 14px", maxWidth: 400 }}>
              <option value="">-- Choose material --</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.file_name}</option>)}
            </select>
            <Btn onClick={generate} disabled={!selId || loading} size="lg" style={{ width: 200 }}>
              {loading ? <><Spinner size={16} /> Generating…</> : "Generate Cards"}
            </Btn>
          </div>
        </Card>
      )}

      {cards.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: DS.textMuted }}>Card {current + 1} of {cards.length}</span>
              <span style={{ fontSize: 13, color: DS.success }}>✓ Known: {known.size}</span>
            </div>
            <ProgressBar value={current + 1} max={cards.length} />
          </div>

          <div onClick={() => setFlipped(f => !f)} style={{ width: "100%", maxWidth: 560, cursor: "pointer", perspective: 1000 }}>
            <div style={{
              position: "relative", height: 260, transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", transition: "transform 0.5s",
            }}>
              <div style={{
                position: "absolute", inset: 0, backfaceVisibility: "hidden",
                background: DS.gradPrimary, borderRadius: DS.radiusLg, padding: 32,
                display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 12,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 2 }}>QUESTION</div>
                <div style={{ textAlign: "center", fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1.5 }}>{cards[current]?.question}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>Click to reveal answer</div>
              </div>
              <div style={{
                position: "absolute", inset: 0, backfaceVisibility: "hidden",
                background: DS.gradAccent, borderRadius: DS.radiusLg, padding: 32,
                display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 12,
                transform: "rotateY(180deg)",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(0,0,0,0.5)", letterSpacing: 2 }}>ANSWER</div>
                <div style={{ textAlign: "center", fontSize: 16, fontWeight: 600, color: "#000", lineHeight: 1.7 }}>{cards[current]?.answer}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Btn variant="ghost" onClick={prev} disabled={current === 0}>← Prev</Btn>
            <Btn variant="ghost" onClick={() => { setKnown(k => new Set([...k, current])); next(); }}
              style={{ color: DS.success, borderColor: DS.success }}>✓ Got it</Btn>
            <Btn onClick={next} disabled={current === cards.length - 1}>Next →</Btn>
          </div>

          {current === cards.length - 1 && (
            <Card style={{ textAlign: "center", padding: 24, maxWidth: 400 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
              <p style={{ color: DS.textPrimary }}>You have reviewed all cards! Known: {known.size}/{cards.length}</p>
              <Btn onClick={() => { setCurrent(0); setFlipped(false); setKnown(new Set()); }}>Review Again</Btn>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TUTOR PAGE ───────────────────────────────────────────────────────────────
function TutorPage({ materialId }) {
  const [materials, setMaterials] = useState([]);
  const [selId, setSelId] = useState(materialId || "");
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Hello! I am your AI tutor. Ask me anything about your study materials! 🎓",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const bottomRef = useRef();

  useEffect(() => { apiFetch("/materials/").then(setMaterials).catch(() => {}); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages(m => [...m, userMsg]);
    setInput(""); setLoading(true);
    try {
      const data = await apiFetch("/tutor/chat", {
        method: "POST",
        body: JSON.stringify({
          message: userMsg.content,
          material_id: selId || null,
          history: messages.slice(-6),
          language,
        }),
      });
      setMessages(m => [...m, { role: "assistant", content: data.response }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: `Error: ${e.message}` }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "calc(100vh - 140px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ color: DS.textPrimary, margin: 0, fontSize: 22, fontWeight: 800 }}>🤖 AI Tutor</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <select value={selId} onChange={e => setSelId(e.target.value)}
            style={{ background: DS.bgPanel, border: `1px solid ${DS.border}`, borderRadius: DS.radiusSm, color: DS.textPrimary, fontFamily: DS.font, fontSize: 13, padding: "7px 12px", maxWidth: 220 }}>
            <option value="">No material context</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.file_name.slice(0, 30)}</option>)}
          </select>
          <select value={language} onChange={e => setLanguage(e.target.value)}
            style={{ background: DS.bgPanel, border: `1px solid ${DS.border}`, borderRadius: DS.radiusSm, color: DS.textPrimary, fontFamily: DS.font, fontSize: 13, padding: "7px 12px" }}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="mr">Marathi</option>
          </select>
        </div>
      </div>

      <Card style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "75%", padding: "12px 16px",
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: m.role === "user" ? DS.gradPrimary : DS.bgPanel,
              color: m.role === "user" ? "#fff" : DS.textPrimary,
              fontFamily: DS.font, fontSize: 14, lineHeight: 1.7,
            }}>
              {m.role === "assistant" && <span style={{ marginRight: 6 }}>🤖</span>}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 6, padding: "12px 16px", background: DS.bgPanel, borderRadius: "18px 18px 18px 4px", width: "fit-content" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%", background: DS.primary,
                animation: `bounce 1.2s ${i * 0.2}s infinite`,
              }} />
            ))}
            <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.8)}40%{transform:scale(1.2)}}`}</style>
          </div>
        )}
        <div ref={bottomRef} />
      </Card>

      <div style={{ display: "flex", gap: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask your tutor anything… (Enter to send)"
          style={{
            flex: 1, background: DS.bgPanel, border: `1px solid ${DS.border}`,
            borderRadius: DS.radiusSm, color: DS.textPrimary, fontFamily: DS.font,
            fontSize: 14, padding: "11px 16px", outline: "none",
          }} />
        <Btn onClick={send} disabled={loading || !input.trim()}>Send ➤</Btn>
      </div>
    </div>
  );
}

// ─── PROGRESS PAGE ────────────────────────────────────────────────────────────
function ProgressPage() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiFetch("/progress/dashboard"), apiFetch("/quiz/history")])
      .then(([d, h]) => { setData(d); setHistory(h); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function getStudyPlan() {
    setLoadingPlan(true);
    const res = await apiFetch("/progress/study-plan").catch(() => null);
    if (res) setPlan(res);
    setLoadingPlan(false);
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}><Spinner size={40} /></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h2 style={{ color: DS.textPrimary, margin: 0, fontSize: 22, fontWeight: 800 }}>📊 Learning Progress</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16 }}>
        {[
          { label: "Total Uploads", value: data?.total_uploads || 0, color: DS.primary },
          { label: "Quizzes Done", value: data?.total_quizzes || 0, color: DS.accent },
          { label: "Avg Score", value: `${data?.average_score || 0}%`, color: DS.warn },
          { label: "Streak", value: `${data?.streak || 0} days`, color: DS.success },
          { label: "Flashcard Sets", value: data?.total_flashcard_sets || 0, color: DS.danger },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: DS.fontMono }}>{s.value}</div>
            <div style={{ fontSize: 12, color: DS.textMuted, marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {data?.weekly_activity && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
          <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <h4 style={{ color: DS.textSecondary, margin: 0, fontSize: 14 }}>Overall Score</h4>
            <DonutChart value={data?.average_score || 0} max={100} color={DS.primary} label="Average" />
          </Card>
          <Card>
            <h4 style={{ margin: "0 0 16px", color: DS.textSecondary, fontSize: 14 }}>📅 Weekly Activity</h4>
            <BarChart data={data.weekly_activity} xKey="date" yKey="quizzes" />
          </Card>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h3 style={{ color: DS.textPrimary, margin: "0 0 16px", fontSize: 16 }}>🕑 Recent Quiz Results</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.slice(0, 10).map(r => (
              <Card key={r.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 18px" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: r.percentage >= 70 ? `${DS.success}22` : `${DS.warn}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 800, color: r.percentage >= 70 ? DS.success : DS.warn,
                }}>{Math.round(r.percentage)}%</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: DS.textPrimary }}>{r.topic}</div>
                  <div style={{ fontSize: 12, color: DS.textMuted }}>{r.score}/{r.total} correct</div>
                </div>
                <div style={{ fontSize: 12, color: DS.textMuted }}>{formatDate(r.timestamp)}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h4 style={{ color: DS.textPrimary, margin: 0, fontSize: 16 }}>📅 AI Study Planner</h4>
          <Btn onClick={getStudyPlan} disabled={loadingPlan} size="sm">
            {loadingPlan ? <Spinner size={14} /> : "Generate Plan"}
          </Btn>
        </div>
        {plan ? (
          <div style={{ color: DS.textPrimary, fontSize: 14, lineHeight: 1.9, whiteSpace: "pre-wrap", background: DS.bgPanel, padding: 16, borderRadius: DS.radiusSm }}>
            {plan.plan}
          </div>
        ) : (
          <p style={{ color: DS.textMuted, fontSize: 14 }}>Generate a personalised 7-day study plan based on your uploaded materials.</p>
        )}
      </Card>
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage({ user, onLogout }) {
  const [form, setForm] = useState({ full_name: user?.full_name || "", language: user?.language || "en" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/auth/me", { method: "PATCH", body: JSON.stringify(form) });
      setToast({ msg: "Profile updated!", type: "success" });
    } catch (e) { setToast({ msg: e.message, type: "error" }); }
    setSaving(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h2 style={{ color: DS.textPrimary, margin: 0, fontSize: 22, fontWeight: 800 }}>👤 Profile</h2>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <h4 style={{ color: DS.textPrimary, margin: 0 }}>Personal Information</h4>
          <Input label="Full Name" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} />
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: DS.textSecondary, display: "block", marginBottom: 6 }}>Preferred Language</label>
            <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
              style={{ background: DS.bgPanel, border: `1px solid ${DS.border}`, borderRadius: DS.radiusSm, color: DS.textPrimary, fontFamily: DS.font, fontSize: 14, padding: "10px 14px", width: "100%" }}>
              <option value="en">🇬🇧 English</option>
              <option value="hi">🇮🇳 Hindi</option>
              <option value="mr">🇮🇳 Marathi</option>
            </select>
          </div>
          <Btn onClick={save} disabled={saving}>{saving ? <Spinner size={16} /> : "Save Changes"}</Btn>
        </Card>
        <Card>
          <h4 style={{ color: DS.textPrimary, margin: "0 0 16px" }}>Account Details</h4>
          {[
            { label: "Email", value: user?.email },
            { label: "Streak", value: `${user?.streak || 0} days 🔥` },
            { label: "Total Points", value: `${user?.total_score || 0} pts` },
            { label: "Role", value: user?.is_admin ? "Administrator" : "Student" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${DS.border}` }}>
              <span style={{ fontSize: 13, color: DS.textMuted }}>{label}</span>
              <span style={{ fontSize: 13, color: DS.textPrimary, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: 20 }}>
            <Btn variant="danger" onClick={onLogout}>Sign Out</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", icon: "🏠", label: "Dashboard" },
  { id: "upload", icon: "📤", label: "Upload" },
  { id: "materials", icon: "📚", label: "Materials" },
  { id: "quiz", icon: "🧠", label: "Quiz" },
  { id: "flashcards", icon: "🃏", label: "Flashcards" },
  { id: "tutor", icon: "🤖", label: "AI Tutor" },
  { id: "progress", icon: "📊", label: "Progress" },
  { id: "profile", icon: "👤", label: "Profile" },
];

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ala_user")); } catch { return null; }
  });
  const [page, setPage] = useState("dashboard");
  const [pageParam, setPageParam] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const nav = (p, param = null) => { setPage(p); setPageParam(param); };

  function logout() {
    localStorage.removeItem("ala_token");
    localStorage.removeItem("ala_user");
    setUser(null);
  }

  if (!user) return <AuthPage onLogin={u => { setUser(u); setPage("dashboard"); }} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: DS.bg, fontFamily: DS.font }}>
      <style>{`*{box-sizing:border-box}body{margin:0}input::placeholder,textarea::placeholder{color:${DS.textMuted}}select option{background:${DS.bgPanel};color:${DS.textPrimary}}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${DS.bg}}::-webkit-scrollbar-thumb{background:${DS.border};border-radius:3px}`}</style>

      {/* Sidebar */}
      <nav style={{
        width: sidebarOpen ? 220 : 64, background: DS.bgCard,
        borderRight: `1px solid ${DS.border}`, display: "flex", flexDirection: "column",
        transition: "width 0.25s", overflow: "hidden", flexShrink: 0,
        position: "sticky", top: 0, height: "100vh",
      }}>
        <div style={{ padding: "20px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${DS.border}` }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>🎓</span>
          {sidebarOpen && <span style={{ fontWeight: 800, fontSize: 14, color: DS.textPrimary, whiteSpace: "nowrap" }}>AI Learning</span>}
        </div>

        {sidebarOpen && (user?.streak > 0) && (
          <div style={{ margin: "12px 12px 4px", padding: "8px 12px", background: `${DS.warn}22`, borderRadius: DS.radiusSm, border: `1px solid ${DS.warn}44`, display: "flex", alignItems: "center", gap: 8 }}>
            <span>🔥</span>
            <span style={{ fontSize: 12, color: DS.warn, fontWeight: 600 }}>{user.streak} day streak</span>
          </div>
        )}

        <div style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => nav(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px",
                borderRadius: DS.radiusSm, border: "none", cursor: "pointer",
                background: page === item.id ? `${DS.primary}22` : "transparent",
                color: page === item.id ? DS.primary : DS.textSecondary,
                borderLeft: page === item.id ? `3px solid ${DS.primary}` : "3px solid transparent",
                transition: "all 0.15s", width: "100%", textAlign: "left",
                fontFamily: DS.font, fontWeight: 600, fontSize: 14,
              }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
            </button>
          ))}
        </div>

        <button onClick={() => setSidebarOpen(s => !s)}
          style={{
            margin: "8px 8px 16px", padding: 8, background: "transparent",
            border: `1px solid ${DS.border}`, borderRadius: DS.radiusSm,
            color: DS.textMuted, cursor: "pointer", fontFamily: DS.font, fontSize: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          {sidebarOpen ? "◂ Collapse" : "▸"}
        </button>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto" }}>
        <header style={{
          background: DS.bgCard, borderBottom: `1px solid ${DS.border}`,
          padding: "14px 28px", display: "flex", justifyContent: "space-between",
          alignItems: "center", position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: DS.textPrimary }}>
            {NAV_ITEMS.find(n => n.id === page)?.icon} {NAV_ITEMS.find(n => n.id === page)?.label}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 13, color: DS.textMuted }}>{user?.email}</div>
            <div onClick={() => nav("profile")}
              style={{
                width: 36, height: 36, borderRadius: "50%", background: DS.gradPrimary,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer",
              }}>
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
          {page === "dashboard"  && <DashboardPage user={user} onNav={nav} />}
          {page === "upload"     && <UploadPage onNav={nav} />}
          {page === "materials"  && <MaterialsPage onNav={nav} />}
          {page === "quiz"       && <QuizPage materialId={pageParam} onNav={nav} />}
          {page === "flashcards" && <FlashcardsPage materialId={pageParam} />}
          {page === "tutor"      && <TutorPage materialId={pageParam} />}
          {page === "progress"   && <ProgressPage />}
          {page === "profile"    && <ProfilePage user={user} onLogout={logout} />}
        </div>
      </main>
    </div>
  );
}
