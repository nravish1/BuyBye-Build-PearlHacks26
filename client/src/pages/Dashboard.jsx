import { useState } from "react";

// ── Dummy Data ──────────────────────────────────────────────────────────────
const USER = { name: "Sarah" };
const BUDGET = { total: 300, spent: 240, remaining: 60 };

const CATEGORIES = [
  { name: "Clothing",       spent: 180, total: 200, emoji: "🧥" },
  { name: "Food & Drink",   spent: 60,  total: 100, emoji: "🍜" },
  { name: "Beauty",         spent: 45,  total: 60,  emoji: "🌸" },
  { name: "Entertainment",  spent: 20,  total: 50,  emoji: "🎬" },
];

const PURCHASES = [
  { id: 1, item: "ASOS Wrap Dress",          cost: 65, category: "Clothing",       tag: "want", date: "Feb 20", paused: true  },
  { id: 2, item: "Trader Joe's Grocery Run", cost: 42, category: "Food",           tag: "need", date: "Feb 19", paused: false },
  { id: 3, item: "Rare Beauty Blush",        cost: 24, category: "Beauty",         tag: "want", date: "Feb 18", paused: true  },
  { id: 4, item: "Spotify Premium",          cost: 10, category: "Entertainment",  tag: "need", date: "Feb 17", paused: false },
  { id: 5, item: "Zara Linen Jacket",        cost: 89, category: "Clothing",       tag: "want", date: "Feb 16", paused: true  },
];

const GOAL = { label: "Trip to Japan", saved: 1360, target: 2000 };

// ── Helpers ──────────────────────────────────────────────────────────────────
const pct = (a, b) => Math.min(100, Math.round((a / b) * 100));

// ── Budget Ring ──────────────────────────────────────────────────────────────
function BudgetRing({ spent, total }) {
  const used = pct(spent, total);
  const remaining = total - spent;
  const radius = 72;
  const circ = 2 * Math.PI * radius;
  const dash = (used / 100) * circ;

  const stroke =
    used >= 90 ? "#b06060" : used >= 70 ? "#b8885a" : "#9e7070";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 168 168">
          <circle cx="84" cy="84" r={radius} fill="none" stroke="#edddd4" strokeWidth="13" />
          <circle
            cx="84" cy="84" r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="13"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.7s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "'Lora', serif" }}>
            ${remaining}
          </span>
          <span className="text-xs mt-0.5" style={{ color: "var(--text-light)" }}>remaining</span>
        </div>
      </div>

      <div className="flex gap-6 text-sm">
        <div className="text-center">
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>${spent}</p>
          <p className="text-xs" style={{ color: "var(--text-light)" }}>spent</p>
        </div>
        <div className="w-px" style={{ background: "var(--dusty)" }} />
        <div className="text-center">
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>${total}</p>
          <p className="text-xs" style={{ color: "var(--text-light)" }}>budget</p>
        </div>
      </div>
    </div>
  );
}

// ── Spending Bar ─────────────────────────────────────────────────────────────
function SpendingBar({ name, spent, total, emoji }) {
  const used = pct(spent, total);
  const fillClass =
    used >= 90 ? "danger" : used >= 70 ? "warning" : "";

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {emoji} {name}
        </span>
        <span className="text-xs" style={{ color: "var(--text-light)" }}>
          ${spent} / ${total}
        </span>
      </div>
      <div className="progress-track">
        <div className={`progress-fill ${fillClass}`} style={{ width: `${used}%` }} />
      </div>
    </div>
  );
}

// ── Purchase Row ─────────────────────────────────────────────────────────────
function PurchaseRow({ item, cost, category, tag, date, paused }) {
  return (
    <div
      className="flex items-center justify-between py-3"
      style={{ borderBottom: "1px solid var(--card-border)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: paused ? "#b8885a" : "#7a9e7a" }}
        />
        <div>
          <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
            {item}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-light)" }}>
            {category} · {date}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={tag === "want" ? "tag-want" : "tag-need"}>{tag}</span>
        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          ${cost}
        </span>
      </div>
    </div>
  );
}

// ── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({ label, saved, target }) {
  const used = pct(saved, target);
  const left = target - saved;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, #a07878, #c4a0a0)",
        color: "white",
      }}
    >
      <p
        className="text-xs font-bold uppercase tracking-widest mb-1"
        style={{ opacity: 0.65 }}
      >
        Long-term Goal
      </p>
      <h3
        className="text-lg mb-4"
        style={{ fontFamily: "'Lora', serif", fontStyle: "italic", color: "white" }}
      >
        {label}
      </h3>

      <div
        className="h-2 rounded-full overflow-hidden mb-3"
        style={{ background: "rgba(255,255,255,0.25)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${used}%`, background: "rgba(255,255,255,0.85)" }}
        />
      </div>

      <div className="flex justify-between text-sm">
        <span className="font-semibold">${saved.toLocaleString()} saved</span>
        <span style={{ opacity: 0.65 }}>${left.toLocaleString()} to go</span>
      </div>

      <p className="text-xs mt-3" style={{ opacity: 0.55, fontStyle: "italic" }}>
        Every paused purchase brings you closer
      </p>
    </div>
  );
}

// ── Stat Chip ────────────────────────────────────────────────────────────────
function StatChip({ label, value, sub, bg, textColor }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: bg, color: textColor }}>
      <p
        className="text-2xl font-bold"
        style={{ fontFamily: "'Lora', serif" }}
      >
        {value}
      </p>
      <p className="text-xs font-semibold mt-0.5">{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ opacity: 0.6 }}>{sub}</p>}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("all");

  const filtered = PURCHASES.filter((p) => {
    if (activeTab === "want")   return p.tag === "want";
    if (activeTab === "need")   return p.tag === "need";
    if (activeTab === "paused") return p.paused;
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--blush)" }}>

      {/* Nav */}
      <nav
        className="px-6 py-4 flex justify-between items-center sticky top-0 z-10"
        style={{
          background: "rgba(253,250,249,0.85)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--card-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⏸</span>
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "'Lora', serif", color: "var(--text-primary)" }}
          >
            Pause & Think
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Hey, {USER.name} 🌸
          </span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: "var(--petal)", color: "var(--accent-dark)" }}
          >
            {USER.name[0]}
          </div>
        </div>
      </nav>

      {/* Main Grid */}
      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-1 flex flex-col gap-6">

          {/* Budget Ring */}
          <div className="card fade-up fade-up-1 flex flex-col items-center">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-5"
              style={{ color: "var(--text-light)" }}
            >
              Monthly Budget
            </p>
            <BudgetRing spent={BUDGET.spent} total={BUDGET.total} />
          </div>

          {/* Goal */}
          <div className="fade-up fade-up-2">
            <GoalCard {...GOAL} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 fade-up fade-up-3">
            <StatChip
              label="Paused"
              value="12"
              sub="this month"
              bg="var(--petal)"
              textColor="var(--accent-dark)"
            />
            <StatChip
              label="Saved"
              value="$340"
              sub="from pausing"
              bg="#e8efe8"
              textColor="#3d6b3d"
            />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Spending Breakdown */}
          <div className="card fade-up fade-up-2">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-5"
              style={{ color: "var(--text-light)" }}
            >
              Spending by Category
            </p>
            {CATEGORIES.map((c) => (
              <SpendingBar key={c.name} {...c} />
            ))}
          </div>

          {/* Purchase History */}
          <div className="card fade-up fade-up-3">
            <div className="flex justify-between items-center mb-5">
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--text-light)" }}
              >
                Recent Activity
              </p>

              {/* Filter Tabs */}
              <div
                className="flex gap-1 rounded-xl p-1 text-xs"
                style={{ background: "var(--petal)" }}
              >
                {["all", "need", "want", "paused"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="px-3 py-1 rounded-lg font-semibold capitalize transition-all"
                    style={{
                      background: activeTab === tab ? "var(--card-bg)" : "transparent",
                      color: activeTab === tab ? "var(--accent)" : "var(--text-secondary)",
                      boxShadow: activeTab === tab ? "var(--shadow-soft)" : "none",
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--text-light)" }}>
                Nothing here yet.
              </p>
            ) : (
              filtered.map((p) => <PurchaseRow key={p.id} {...p} />)
            )}

            {/* Legend */}
            <div
              className="flex gap-5 mt-4 pt-4"
              style={{ borderTop: "1px solid var(--card-border)" }}
            >
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-light)" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: "#b8885a" }} />
                Paused by extension
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-light)" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: "#7a9e7a" }} />
                Completed
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}