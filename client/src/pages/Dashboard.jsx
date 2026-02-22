import { useState, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";
import { getUser, getPurchases, createLinkToken, exchangeToken, getPlaidTransactions } from "../api";

// ── Helpers ──────────────────────────────────────────────────────────────────
const pct = (a, b) => Math.min(100, Math.round((a / b) * 100));

// ── Budget Ring ──────────────────────────────────────────────────────────────
function BudgetRing({ spent, total }) {
  const used = pct(spent, total);
  const remaining = total - spent;
  const radius = 72;
  const circ = 2 * Math.PI * radius;
  const dash = (used / 100) * circ;
  const stroke = used >= 90 ? "#b06060" : used >= 70 ? "#b8885a" : "#9e7070";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 168 168">
          <circle cx="84" cy="84" r={radius} fill="none" stroke="#edddd4" strokeWidth="13" />
          <circle
            cx="84" cy="84" r={radius}
            fill="none" stroke={stroke} strokeWidth="13"
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
  const fillClass = used >= 90 ? "danger" : used >= 70 ? "warning" : "";
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{emoji} {name}</span>
        <span className="text-xs" style={{ color: "var(--text-light)" }}>${spent} / ${total}</span>
      </div>
      <div className="progress-track">
        <div className={`progress-fill ${fillClass}`} style={{ width: `${used}%` }} />
      </div>
    </div>
  );
}

// ── Purchase Row ─────────────────────────────────────────────────────────────
function PurchaseRow({ item, name, price, cost, amount, category, tag, createdAt, date, paused, decision }) {
  const displayName = item || name || "Unknown";
  const displayCost = price || cost || Math.abs(amount) || 0;
  const displayDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : date || "";
  const isPaused = paused || decision === "paused";

  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: isPaused ? "#b8885a" : "#7a9e7a" }} />
        <div>
          <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{displayName}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-light)" }}>{category} · {displayDate}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {tag && <span className={tag === "want" ? "tag-want" : "tag-need"}>{tag}</span>}
        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          ${Number(displayCost).toFixed(2)}
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
    <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #a07878, #c4a0a0)", color: "white" }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ opacity: 0.65 }}>Long-term Goal</p>
      <h3 className="text-lg mb-4" style={{ fontFamily: "'Lora', serif", fontStyle: "italic", color: "white" }}>{label}</h3>
      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.25)" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${used}%`, background: "rgba(255,255,255,0.85)" }} />
      </div>
      <div className="flex justify-between text-sm">
        <span className="font-semibold">${saved.toLocaleString()} saved</span>
        <span style={{ opacity: 0.65 }}>${left.toLocaleString()} to go</span>
      </div>
      <p className="text-xs mt-3" style={{ opacity: 0.55, fontStyle: "italic" }}>Every paused purchase brings you closer ✨</p>
    </div>
  );
}

// ── Stat Chip ────────────────────────────────────────────────────────────────
function StatChip({ label, value, sub, bg, textColor }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: bg, color: textColor }}>
      <p className="text-2xl font-bold" style={{ fontFamily: "'Lora', serif" }}>{value}</p>
      <p className="text-xs font-semibold mt-0.5">{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ opacity: 0.6 }}>{sub}</p>}
    </div>
  );
}

// ── Plaid Connect Button ──────────────────────────────────────────────────────
function PlaidConnectButton({ userId, onSuccess }) {
  const [linkToken, setLinkToken] = useState(null);

  useEffect(() => {
    createLinkToken(userId).then(data => {
      if (data?.link_token) setLinkToken(data.link_token);
    });
  }, [userId]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token) => {
      await exchangeToken(public_token, userId);
      const txns = await getPlaidTransactions(userId);
      onSuccess(txns);
    },
  });

  return (
    <button
      className="btn-primary w-full mt-4 text-sm"
      onClick={() => open()}
      disabled={!ready || !linkToken}
    >
      🏦 Connect Your Bank
    </button>
  );
}

// ── Plaid category mapping ────────────────────────────────────────────────────
function mapPlaidCategory(plaidCategories) {
  if (!plaidCategories) return "Other";
  const joined = plaidCategories.join(" ").toLowerCase();
  if (joined.includes("food") || joined.includes("restaurant") || joined.includes("coffee")) return "Food & Drink";
  if (joined.includes("shop") || joined.includes("clothing") || joined.includes("apparel")) return "Clothing";
  if (joined.includes("entertain") || joined.includes("music") || joined.includes("movie")) return "Entertainment";
  if (joined.includes("beauty") || joined.includes("spa") || joined.includes("personal care")) return "Beauty";
  return "Other";
}

function buildCategoriesFromPlaid(transactions) {
  const totals = { "Clothing": 0, "Food & Drink": 0, "Beauty": 0, "Entertainment": 0 };
  transactions.forEach(t => {
    const cat = mapPlaidCategory(t.category);
    if (totals[cat] !== undefined) totals[cat] += Math.abs(t.amount);
  });
  return [
    { name: "Clothing",      spent: Math.round(totals["Clothing"]),      total: 200, emoji: "🧥" },
    { name: "Food & Drink",  spent: Math.round(totals["Food & Drink"]),  total: 100, emoji: "🍜" },
    { name: "Beauty",        spent: Math.round(totals["Beauty"]),        total: 60,  emoji: "🌸" },
    { name: "Entertainment", spent: Math.round(totals["Entertainment"]), total: 50,  emoji: "🎬" },
  ];
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab]           = useState("all");
  const [dataSource, setDataSource]         = useState("extension");
  const [user, setUser]                     = useState(null);
  const [purchases, setPurchases]           = useState([]);
  const [plaidTransactions, setPlaidTransactions] = useState([]);
  const [bankConnected, setBankConnected]   = useState(false);
  const [loading, setLoading]               = useState(true);

  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) { window.location.href = "/"; return; }

    const load = async () => {
      const userData     = await getUser(userId);
      const purchaseData = await getPurchases(userId);
      setUser(userData);
      setPurchases(purchaseData || []);

      // If user already has a Plaid token, load their transactions automatically
      if (userData?.plaidAccessToken) {
        const txns = await getPlaidTransactions(userId);
        if (txns?.length) {
          setPlaidTransactions(txns);
          setBankConnected(true);
          setDataSource("bank");
        }
      }
      setLoading(false);
    };

    load();
  }, [userId]);

  const handlePlaidSuccess = (txns) => {
    setPlaidTransactions(txns);
    setBankConnected(true);
    setDataSource("bank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--blush)" }}>
        <p style={{ color: "var(--text-light)" }}>Loading...</p>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const budget      = user?.budget || {};
  const totalBudget = budget.total || 300;
  const goal        = user?.goal || null;

  const categories = bankConnected && plaidTransactions.length
    ? buildCategoriesFromPlaid(plaidTransactions)
    : budget.categories
      ? Object.entries(budget.categories).map(([name, data]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          spent: data.spent || 0,
          total: data.limit || 100,
          emoji: { clothing: "🧥", food: "🍜", beauty: "🌸", entertainment: "🎬" }[name] || "📦",
        }))
      : [
          { name: "Clothing",      spent: 0, total: 200, emoji: "🧥" },
          { name: "Food & Drink",  spent: 0, total: 100, emoji: "🍜" },
          { name: "Beauty",        spent: 0, total: 60,  emoji: "🌸" },
          { name: "Entertainment", spent: 0, total: 50,  emoji: "🎬" },
        ];

  const totalSpent  = categories.reduce((sum, c) => sum + c.spent, 0);
  const pausedCount = purchases.filter(p => p.decision === "paused" || p.paused).length;
  const savedAmount = purchases
    .filter(p => p.decision === "paused" || p.paused)
    .reduce((sum, p) => sum + (p.price || p.cost || 0), 0);

  // Build the list shown in Recent Activity based on selected source
  const activeList = dataSource === "bank"
    ? plaidTransactions.map(t => ({
        _id: t.transaction_id,
        item: t.name,
        cost: Math.abs(t.amount),
        category: mapPlaidCategory(t.category),
        date: t.date,
        paused: false,
      }))
    : purchases;

  const filtered = activeList.filter((p) => {
    if (activeTab === "want")   return p.tag === "want";
    if (activeTab === "need")   return p.tag === "need";
    if (activeTab === "paused") return p.decision === "paused" || p.paused;
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--blush)" }}>

      {/* Nav */}
      <nav className="px-6 py-4 flex justify-between items-center sticky top-0 z-10"
        style={{ background: "rgba(253,250,249,0.85)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--card-border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">⏸</span>
          <span className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "'Lora', serif", color: "var(--text-primary)" }}>
            Pause & Think
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Hey, {user?.name} 🌸</span>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: "var(--petal)", color: "var(--accent-dark)" }}>
            {user?.name?.[0] || "?"}
          </div>
          <button className="btn-soft text-xs"
            onClick={() => { localStorage.clear(); window.location.href = "/"; }}>
            Log out
          </button>
        </div>
      </nav>

      {/* Main Grid */}
      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-1 flex flex-col gap-6">

          {/* Budget Ring + Connect Bank */}
          <div className="card fade-up fade-up-1 flex flex-col items-center">
            <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: "var(--text-light)" }}>
              Monthly Budget
            </p>
            <BudgetRing spent={totalSpent} total={totalBudget} />
            {!bankConnected ? (
              <PlaidConnectButton userId={userId} onSuccess={handlePlaidSuccess} />
            ) : (
              <p className="text-xs mt-4 text-center" style={{ color: "var(--text-light)" }}>✅ Bank connected</p>
            )}
          </div>

          {/* Goal */}
          <div className="fade-up fade-up-2">
            {goal?.label ? (
              <GoalCard label={goal.label} saved={goal.savedAmount || 0} target={goal.targetAmount || 1000} />
            ) : (
              <div className="card text-center py-6">
                <p className="text-sm" style={{ color: "var(--text-light)" }}>No goal set yet</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 fade-up fade-up-3">
            <StatChip label="Paused" value={pausedCount} sub="this month" bg="var(--petal)" textColor="var(--accent-dark)" />
            <StatChip label="Saved" value={`$${savedAmount}`} sub="from pausing" bg="#e8efe8" textColor="#3d6b3d" />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Spending Breakdown */}
          <div className="card fade-up fade-up-2">
            <div className="flex justify-between items-center mb-5">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-light)" }}>
                Spending by Category
              </p>
              {bankConnected && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "var(--petal)", color: "var(--accent)" }}>
                  from bank
                </span>
              )}
            </div>
            {categories.map((c) => <SpendingBar key={c.name} {...c} />)}
          </div>

          {/* Recent Activity */}
          <div className="card fade-up fade-up-3">
            <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-light)" }}>
                Recent Activity
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Source toggle — only show if bank connected */}
                {bankConnected && (
                  <div className="flex gap-1 rounded-xl p-1 text-xs" style={{ background: "var(--petal)" }}>
                    {["extension", "bank"].map(src => (
                      <button key={src} onClick={() => setDataSource(src)}
                        className="px-3 py-1 rounded-lg font-semibold capitalize transition-all"
                        style={{
                          background: dataSource === src ? "var(--card-bg)" : "transparent",
                          color: dataSource === src ? "var(--accent)" : "var(--text-secondary)",
                          boxShadow: dataSource === src ? "var(--shadow-soft)" : "none",
                        }}>
                        {src}
                      </button>
                    ))}
                  </div>
                )}

                {/* Filter tabs */}
                <div className="flex gap-1 rounded-xl p-1 text-xs" style={{ background: "var(--petal)" }}>
                  {["all", "need", "want", "paused"].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className="px-3 py-1 rounded-lg font-semibold capitalize transition-all"
                      style={{
                        background: activeTab === tab ? "var(--card-bg)" : "transparent",
                        color: activeTab === tab ? "var(--accent)" : "var(--text-secondary)",
                        boxShadow: activeTab === tab ? "var(--shadow-soft)" : "none",
                      }}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--text-light)" }}>
                {dataSource === "bank"
                  ? "No bank transactions found."
                  : "No purchases yet — go trigger the extension! 🛍️"}
              </p>
            ) : (
              filtered.map((p) => <PurchaseRow key={p._id || p.transaction_id} {...p} />)
            )}

            <div className="flex gap-5 mt-4 pt-4" style={{ borderTop: "1px solid var(--card-border)" }}>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-light)" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: "#b8885a" }} /> Paused by extension
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-light)" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: "#7a9e7a" }} /> Completed
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}