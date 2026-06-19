import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from "recharts";
import "./assets/DopamineTracker.css";

//  Constants 

const COLORS = {
  bg: "#0f172a",
  card: "#1e293b",
  cardHover: "#263548",
  instant: "#ef4444",
  earned: "#22c55e",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  accent: "#3b82f6",
  border: "#334155",
  surface: "#0f172a",
};

const INSTANT_CATEGORIES = [
  { id: "social_media", label: "Social Media", },
  { id: "youtube", label: "YouTube",  },
  { id: "gaming", label: "Gaming", },
  { id: "junk_food", label: "Junk Food", },
  { id: "netflix", label: "Netflix / Entertainment", },
  { id: "custom_instant", label: "Custom…", },
];

const EARNED_CATEGORIES = [
  { id: "coding", label: "Coding", },
  { id: "reading", label: "Reading", },
  { id: "exercise", label: "Exercise", },
  { id: "writing", label: "Writing", },
  { id: "learning", label: "Learning", },
  { id: "meditation", label: "Meditation", },
  { id: "custom_earned", label: "Custom…", },
];

const MOTIVATIONAL_MESSAGES = [
  "Your future self is getting stronger.",
  "Small wins compound into big results.",
  "Discipline beats motivation every time.",
  "You are building momentum right now.",
  "Every earned hour is an investment.",
  "Progress is invisible until it's undeniable.",
  "The gap between you and your goals closes daily.",
  "Consistency is the only shortcut that exists.",
];

const BADGES = [
  { id: "first_step", label: "First Step", icon: "🌱", desc: "Log your first activity", check: (s) => s.totalActivities >= 1 },
  { id: "productive_day", label: "Productive Day",  desc: "10 earned activities in a day", check: (s) => s.maxEarnedInDay >= 10 },
  { id: "focus_master", label: "Focus Master",  desc: "7-day streak", check: (s) => s.bestStreak >= 7 },
  { id: "discipline_beast", label: "Discipline Beast",  desc: "30-day streak", check: (s) => s.bestStreak >= 30 },
  { id: "dopamine_warrior", label: "Dopamine Warrior",  desc: "100 earned activities", check: (s) => s.totalEarned >= 100 },
];

const TODAY = () => new Date().toISOString().split("T")[0];

//Storage helpers

const load = (key, def) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
};
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {e} };



const S = {
  card: {
    background: COLORS.card,
    borderRadius: 16,
    border: `1px solid ${COLORS.border}`,
    padding: "1.25rem",
  },
  btn: (color = COLORS.accent) => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "0.6rem 1.2rem",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    transition: "opacity 0.15s, transform 0.1s",
  }),
  btnOutline: {
    background: "transparent",
    color: COLORS.textMuted,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "0.5rem 1rem",
    cursor: "pointer",
    fontSize: 13,
    transition: "all 0.15s",
  },
  input: {
    background: "#0f172a",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    color: COLORS.text,
    padding: "0.55rem 0.75rem",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
  },
  select: {
    background: "#0f172a",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    color: COLORS.text,
    padding: "0.55rem 0.75rem",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    display: "block",
    marginBottom: 4,
    fontWeight: 500,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  tag: (color) => ({
    display: "inline-block",
    background: color + "22",
    color: color,
    borderRadius: 20,
    padding: "2px 10px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
  }),
};



function computeStats(activities) {
  const today = TODAY();
  const todayActs = activities.filter((a) => a.date === today);
  const todayInstant = todayActs.filter((a) => a.type === "instant").length;
  const todayEarned = todayActs.filter((a) => a.type === "earned").length;
  const dailyScore = todayEarned * 2 - todayInstant;

  // Streak: consecutive days where earned > instant
  const byDay = {};
  activities.forEach((a) => {
    if (!byDay[a.date]) byDay[a.date] = { instant: 0, earned: 0 };
    byDay[a.date][a.type]++;
  });
  const sortedDays = Object.keys(byDay).sort();
  let currentStreak = 0, bestStreak = 0, streak = 0;
  sortedDays.forEach((d) => {
    if (byDay[d].earned > byDay[d].instant) { streak++; bestStreak = Math.max(bestStreak, streak); }
    else streak = 0;
  });
  // Current streak must end today or yesterday
  const last = sortedDays[sortedDays.length - 1];
  if (last === today || last === new Date(Date.now() - 86400000).toISOString().split("T")[0]) {
    let i = sortedDays.length - 1;
    while (i >= 0 && byDay[sortedDays[i]].earned > byDay[sortedDays[i]].instant) { currentStreak++; i--; }
  }

  const maxEarnedInDay = Math.max(0, ...Object.values(byDay).map((d) => d.earned));
  const totalEarned = activities.filter((a) => a.type === "earned").length;
  const totalActivities = activities.length;

  return { todayInstant, todayEarned, dailyScore, currentStreak, bestStreak, totalActivities, totalEarned, maxEarnedInDay };
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
}

function scoreMessage(score) {
  if (score < 0) return { msg: "You're chasing quick rewards.", color: COLORS.instant };
  if (score === 0) return { msg: "Balanced day.", color: COLORS.textMuted };
  return { msg: "You're investing in your future.", color: COLORS.earned };
}

function toCSV(activities) {
  const headers = ["Date", "Time", "Type", "Category", "Duration (min)", "Notes"];
  const rows = activities.map((a) => [a.date, a.time, a.type, a.category, a.duration, `"${(a.notes || "").replace(/"/g, "''")}"`]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ ...S.card, textAlign: "center", flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: color || COLORS.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MotivationalBanner({ score }) {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % MOTIVATIONAL_MESSAGES.length), 7000);
    return () => clearInterval(t);
  }, []);
  const { color } = scoreMessage(score);
  return (
    <div style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)`, border: `1px solid ${color}44`, borderRadius: 14, padding: "1rem 1.5rem", textAlign: "center", transition: "all 0.3s" }}>
      <div style={{ fontSize: 12, color: color, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Daily Insight</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, fontStyle: "italic" }}>"{MOTIVATIONAL_MESSAGES[msgIdx]}"</div>
    </div>
  );
}

function ActivityForm({ onAdd }) {
  const [type, setType] = useState("earned");
  const [category, setCategory] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const cats = type === "instant" ? INSTANT_CATEGORIES : EARNED_CATEGORIES;

  const handleSubmit = () => {
    if (!category) return;
    const isCustom = category.startsWith("custom_");
    const label = isCustom ? customLabel.trim() : cats.find((c) => c.id === category)?.label;
    if (isCustom && !customLabel.trim()) return;
    onAdd({ type, category: label || category, duration: Number(duration), notes, date: TODAY(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
    setCategory(""); setCustomLabel(""); setNotes(""); setDuration(30);
  };

  return (
    <div style={S.card}>
      <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.text, marginBottom: "1rem" }}>Log Activity</div>

      {/* Type toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
        {["instant", "earned"].map((t) => (
          <button key={t} onClick={() => { setType(t); setCategory(""); }}
            style={{ ...S.btn(t === "instant" ? COLORS.instant : COLORS.earned), flex: 1, opacity: type === t ? 1 : 0.35, fontSize: 13 }}>
            {t === "instant" ? "⚡ Instant" : "🌱 Earned"}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={S.label}>Category</label>
          <select style={S.select} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select…</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Duration (min)</label>
          <input type="number" min={1} max={480} style={S.input} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
      </div>

      {category?.startsWith("custom_") && (
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Activity Name</label>
          <input style={S.input} placeholder="Name your activity…" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={S.label}>Notes (optional)</label>
        <input style={S.input} placeholder="How did it feel?" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <button onClick={handleSubmit} disabled={!category || (category.startsWith("custom_") && !customLabel.trim())}
        style={{ ...S.btn(type === "instant" ? COLORS.instant : COLORS.earned), width: "100%", opacity: (!category || (category.startsWith("custom_") && !customLabel.trim())) ? 0.4 : 1 }}>
        + Log {type === "instant" ? "Instant" : "Earned"} Activity
      </button>
    </div>
  );
}

function ActivityHistory({ activities, onDelete, search, setSearch, filterDate, setFilterDate }) {
  const filtered = activities.filter((a) => {
    const matchSearch = !search || a.category.toLowerCase().includes(search.toLowerCase()) || (a.notes || "").toLowerCase().includes(search.toLowerCase());
    const matchDate = !filterDate || a.date === filterDate;
    return matchSearch && matchDate;
  }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  return (
    <div style={S.card}>
      <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.text, marginBottom: "1rem" }}>Activity History</div>
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
        <input style={{ ...S.input, flex: 2, minWidth: 140 }} placeholder="🔍 Search activities…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <input type="date" style={{ ...S.input, flex: 1, minWidth: 130, colorScheme: "dark" }} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        {filterDate && <button style={S.btnOutline} onClick={() => setFilterDate("")}>Clear</button>}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: COLORS.textMuted, padding: "2rem", fontSize: 14 }}>
          {activities.length === 0 ? "No activities logged yet. Start tracking above!" : "No activities match your filters."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
          {filtered.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#0f172a", borderRadius: 10, padding: "0.65rem 0.9rem", border: `1px solid ${COLORS.border}` }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: a.type === "instant" ? COLORS.instant : COLORS.earned, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text }}>{a.category}</div>
                {a.notes && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.notes}</div>}
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, textAlign: "right", flexShrink: 0 }}>
                <div>{a.duration}m</div>
                <div>{a.date === TODAY() ? a.time : a.date}</div>
              </div>
              <div style={S.tag(a.type === "instant" ? COLORS.instant : COLORS.earned)}>{a.type === "instant" ? "-1" : "+2"}</div>
              <button onClick={() => onDelete(a.id)} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChartsSection({ activities }) {
  const last7 = getLast7Days();
  const byDay = {};
  activities.forEach((a) => {
    if (!byDay[a.date]) byDay[a.date] = { instant: 0, earned: 0 };
    byDay[a.date][a.type]++;
  });

  const weeklyData = last7.map((d) => ({
    date: d.slice(5),
    Instant: byDay[d]?.instant || 0,
    Earned: byDay[d]?.earned || 0,
  }));

  const totalInstant = activities.filter((a) => a.type === "instant").length;
  const totalEarned = activities.filter((a) => a.type === "earned").length;
  const pieData = [
    { name: "Instant", value: totalInstant },
    { name: "Earned", value: totalEarned },
  ].filter((d) => d.value > 0);

  const trendData = last7.map((d) => ({
    date: d.slice(5),
    Score: (byDay[d]?.earned || 0) * 2 - (byDay[d]?.instant || 0),
  }));

  const tipStyle = { background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, fontSize: 12 };

  if (activities.length === 0) {
    return (
      <div style={{ ...S.card, textAlign: "center", color: COLORS.textMuted, padding: "2.5rem" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
        <div>Charts will appear once you log some activities.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
      {/* Weekly bar */}
      <div style={S.card}>
        <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text, marginBottom: 12 }}>This Week</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="date" tick={{ fill: COLORS.textMuted, fontSize: 11 }} />
            <YAxis tick={{ fill: COLORS.textMuted, fontSize: 11 }} />
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: COLORS.textMuted }} />
            <Bar dataKey="Instant" fill={COLORS.instant} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Earned" fill={COLORS.earned} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie */}
      <div style={S.card}>
        <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text, marginBottom: 12 }}>Overall Split</div>
        {pieData.length === 0 ? <div style={{ textAlign: "center", color: COLORS.textMuted, paddingTop: 60 }}>Log activities to see the split.</div> : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={i === 0 ? COLORS.instant : COLORS.earned} />)}
              </Pie>
              <Tooltip contentStyle={tipStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Score trend */}
      <div style={{ ...S.card, gridColumn: "1 / -1" }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text, marginBottom: 12 }}>Daily Score Trend (7 days)</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="date" tick={{ fill: COLORS.textMuted, fontSize: 11 }} />
            <YAxis tick={{ fill: COLORS.textMuted, fontSize: 11 }} />
            <Tooltip contentStyle={tipStyle} />
            <Line type="monotone" dataKey="Score" stroke={COLORS.accent} strokeWidth={2} dot={{ fill: COLORS.accent, r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AchievementsSection({ stats }) {
  return (
    <div style={S.card}>
      <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.text, marginBottom: "1rem" }}>Achievements</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
        {BADGES.map((b) => {
          const unlocked = b.check(stats);
          return (
            <div key={b.id} style={{
              background: unlocked ? `${COLORS.accent}18` : "#0f172a",
              border: `1px solid ${unlocked ? COLORS.accent : COLORS.border}`,
              borderRadius: 12, padding: "0.85rem 1rem",
              opacity: unlocked ? 1 : 0.45,
              transition: "all 0.2s",
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{b.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: unlocked ? COLORS.text : COLORS.textMuted }}>{b.label}</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{b.desc}</div>
              {unlocked && <div style={{ fontSize: 10, color: COLORS.accent, fontWeight: 700, marginTop: 4, letterSpacing: "0.05em" }}>✓ UNLOCKED</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}



export default function DopamineTracker() {
  const [activities, setActivities] = useState(() => load("dt_activities", []));
  const [activeTab, setActiveTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [msgKey, setMsgKey] = useState(0);

  useEffect(() => { save("dt_activities", activities); }, [activities]);

  const addActivity = useCallback((act) => {
    setActivities((prev) => [...prev, { ...act, id: Date.now() + Math.random() }]);
    setMsgKey((k) => k + 1);
  }, []);

  const deleteActivity = useCallback((id) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const resetAll = () => {
    if (window.confirm("Reset ALL data? This cannot be undone.")) {
      setActivities([]);
    }
  };

  const exportCSV = () => {
    const csv = toCSV(activities);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "dopamine_tracker.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = computeStats(activities);
  const { msg: scoreMsg, color: scoreColor } = scoreMessage(stats.dailyScore);

  const NAV_TABS = [
    { id: "dashboard", label: "Dashboard",  },
    { id: "log", label: "Log", icon: "+" },
    { id: "history", label: "History",  },
    { id: "charts", label: "Charts",  },
    { id: "achievements", label: "Badges",  },
  ];

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Navbar */}
      <nav style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }} className="name">
          <img src="src\assets\favicon-black-512.png " className="logo" alt="" srcset="" />
            <span style={{ marginLeft: 6 }}>Dopamine</span>
            <span style={{ color: COLORS.earned }}> Tracker</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {NAV_TABS.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ background: activeTab === t.id ? COLORS.accent + "22" : "transparent", border: activeTab === t.id ? `1px solid ${COLORS.accent}55` : "1px solid transparent", color: activeTab === t.id ? COLORS.accent : COLORS.textMuted, borderRadius: 8, padding: "0.35rem 0.7rem", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}>
                <span style={{ marginRight: 4 }}>{t.icon}</span>
                <span className="nav-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem" }}>

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <MotivationalBanner key={msgKey} score={stats.dailyScore} />

            {/* Stat cards */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <StatCard label="Instant Today" value={stats.todayInstant} sub="-1 pt each" color={COLORS.instant} />
              <StatCard label="Earned Today" value={stats.todayEarned} sub="+2 pts each" color={COLORS.earned} />
              <StatCard label="Daily Score" value={stats.dailyScore > 0 ? `+${stats.dailyScore}` : stats.dailyScore} sub={scoreMsg} color={scoreColor} />
              <StatCard label="Streak" value={`${stats.currentStreak}d`} sub={`Best: ${stats.bestStreak}d`} color={COLORS.accent} />
              <StatCard label="Total Logged" value={stats.totalActivities} sub={`${stats.totalEarned} earned`} />
            </div>

            {/* Score bar */}
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: COLORS.instant }}> Instant ({stats.todayInstant})</span>
                <span style={{ color: scoreColor, fontWeight: 700 }}>{scoreMsg}</span>
                <span style={{ color: COLORS.earned }}> Earned ({stats.todayEarned})</span>
              </div>
              <div style={{ height: 8, background: "#0f172a", borderRadius: 99, overflow: "hidden" }}>
                {(stats.todayInstant + stats.todayEarned) > 0 && (
                  <div style={{
                    height: "100%",
                    width: `${(stats.todayEarned / (stats.todayInstant + stats.todayEarned)) * 100}%`,
                    background: COLORS.earned,
                    borderRadius: 99,
                    transition: "width 0.5s ease",
                  }} />
                )}
              </div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6, textAlign: "center" }}>
                {stats.todayInstant + stats.todayEarned === 0 ? "Log activities to see your balance." : `${Math.round((stats.todayEarned / (stats.todayInstant + stats.todayEarned)) * 100)}% earned today`}
              </div>
            </div>

            {/* Quick add shortcuts */}
            <div style={S.card}>
              <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text, marginBottom: 12 }}>Quick Log</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {EARNED_CATEGORIES.filter((c) => !c.id.startsWith("custom")).map((c) => (
                  <button key={c.id} onClick={() => addActivity({ type: "earned", category: c.label, duration: 30, notes: "", date: TODAY(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })}
                    style={{ ...S.btnOutline, color: COLORS.earned, borderColor: COLORS.earned + "44", fontSize: 12 }}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Utility buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={exportCSV} style={{ ...S.btnOutline, fontSize: 12 }}>⬇️ Export CSV</button>
              <button onClick={resetAll} style={{ ...S.btnOutline, color: COLORS.instant, borderColor: COLORS.instant + "44", fontSize: 12 }}>🗑️ Reset All Data</button>
            </div>
          </div>
        )}

        {activeTab === "log" && (
          <div style={{ maxWidth: 520 }}>
            <ActivityForm onAdd={addActivity} />
          </div>
        )}

        {activeTab === "history" && (
          <ActivityHistory activities={activities} onDelete={deleteActivity} search={search} setSearch={setSearch} filterDate={filterDate} setFilterDate={setFilterDate} />
        )}

        {activeTab === "charts" && <ChartsSection activities={activities} />}

        {activeTab === "achievements" && <AchievementsSection stats={stats} />}
      </div>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "2rem 1rem", color: COLORS.textMuted, fontSize: 12, borderTop: `1px solid ${COLORS.border}`, marginTop: "2rem" }}>
        Dopamine Tracker — build the life you actually want.
      </footer>

      <style>{`
        @media (max-width: 600px) {
          .nav-label { display: none; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); }
      `}</style>
    </div>
  );
}
