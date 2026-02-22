import { useState, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";
import { getUser, getPurchases, createLinkToken, exchangeToken, getPlaidTransactions, updateUser } from "../api";

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

// ── Budget Editor ────────────────────────────────────────────────────────────
function BudgetEditor({ budget, userId, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [form, setForm] = useState({
    total:         budget?.total || "",
    clothing:      budget?.categories?.clothing?.limit  || budget?.categories?.clothing  || "",
    food:          budget?.categories?.food?.limit      || budget?.categories?.food       || "",
    beauty:        budget?.categories?.beauty?.limit    || budget?.categories?.beauty     || "",
    entertainment: budget?.categories?.entertainment?.limit || budget?.categories?.entertainment || "",
  });

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.total || isNaN(form.total)) { setError("Please enter a valid total budget"); return; }
    setSaving(true); setError(null);
    try {
      const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
      await fetch(`${BASE_URL}/user/${userId}/budget`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total: Number(form.total),
          categories: {
            clothing:      { limit: Number(form.clothing)      || 0, spent: budget?.categories?.clothing?.spent      || 0 },
            food:          { limit: Number(form.food)          || 0, spent: budget?.categories?.food?.spent          || 0 },
            beauty:        { limit: Number(form.beauty)        || 0, spent: budget?.categories?.beauty?.spent        || 0 },
            entertainment: { limit: Number(form.entertainment) || 0, spent: budget?.categories?.entertainment?.spent || 0 },
          }
        }),
      });
      await onSaved();
      setEditing(false);
    } catch (e) {
      setError("Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "7px 10px",
    border: "1px solid var(--dusty)", borderRadius: "8px",
    fontSize: "13px", color: "var(--text-primary)",
    background: "white", outline: "none", fontFamily: "inherit",
    marginTop: "3px", boxSizing: "border-box",
  };

  const rowStyle = { marginBottom: "10px" };
  const labelStyle = { fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block" };

  if (editing) return (
    <div style={{ width: "100%", marginTop: "16px", borderTop: "1px solid var(--card-border)", paddingTop: "14px" }}>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-light)" }}>Edit Budget</p>
        <button onClick={() => { setEditing(false); setError(null); }}
          style={{ fontSize: "12px", color: "var(--text-light)", background: "none", border: "none", cursor: "pointer" }}>
          Cancel
        </button>
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>Monthly Total ($)</label>
        <input type="number" min="1" placeholder="300" value={form.total} onChange={set("total")} style={inputStyle} />
      </div>

      <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-light)", marginBottom: "8px", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Category Limits
      </p>

      {[
        { key: "clothing",      label: "🧥 Clothing" },
        { key: "food",          label: "🍜 Food & Drink" },
        { key: "beauty",        label: "🌸 Beauty" },
        { key: "entertainment", label: "🎬 Entertainment" },
      ].map(({ key, label }) => (
        <div key={key} style={rowStyle}>
          <label style={labelStyle}>{label} ($)</label>
          <input type="number" min="0" placeholder="0" value={form[key]} onChange={set(key)} style={inputStyle} />
        </div>
      ))}

      {error && <p style={{ fontSize: "11px", color: "#b06060", marginBottom: "8px" }}>{error}</p>}

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full text-sm"
        style={{ opacity: saving ? 0.7 : 1, marginTop: "4px" }}>
        {saving ? "Saving..." : "Save Budget"}
      </button>
    </div>
  );

  return (
    <button onClick={() => setEditing(true)}
      className="btn-soft w-full text-xs mt-4"
      style={{ marginTop: "14px" }}>
      Edit Budget
    </button>
  );
}

// ── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, userId, onSaved }) {
  const [editing, setEditing] = useState(!goal?.label);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [form, setForm] = useState({
    label:        goal?.label        || "",
    targetAmount: goal?.targetAmount || "",
    savedAmount:  goal?.savedAmount  || "",
    deadline:     goal?.deadline?.slice(0, 10) || "",
  });

  const saved  = Number(goal?.savedAmount)  || 0;
  const target = Number(goal?.targetAmount) || 0;
  const used   = target > 0 ? pct(saved, target) : 0;
  const left   = Math.max(0, target - saved);
  const daysLeft = goal?.deadline
    ? Math.max(0, Math.ceil((new Date(goal.deadline) - new Date()) / 86400000))
    : null;

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.label.trim())   { setError("Please enter a goal name"); return; }
    if (!form.targetAmount)   { setError("Please enter a target amount"); return; }
    setSaving(true); setError(null);
    try {
      const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
      await fetch(`${BASE_URL}/user/${userId}/goal`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label:        form.label.trim(),
          targetAmount: Number(form.targetAmount),
          savedAmount:  Number(form.savedAmount) || 0,
          deadline:     form.deadline || null,
        }),
      });
      await onSaved();
      setEditing(false);
    } catch (e) {
      setError("Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "8px 11px",
    border: "1px solid var(--dusty)", borderRadius: "10px",
    fontSize: "13px", color: "var(--text-primary)",
    background: "white", outline: "none", fontFamily: "inherit",
    marginTop: "4px", boxSizing: "border-box",
  };

  // ── Edit form ─────────────────────────────────────────────────────────────
  if (editing) return (
    <div className="card" style={{ border: "1px solid var(--dusty)" }}>
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-light)" }}>
          {goal?.label ? "Edit Goal" : "Set a Goal"}
        </p>
        {goal?.label && (
          <button onClick={() => { setEditing(false); setError(null); }}
            style={{ fontSize: "12px", color: "var(--text-light)", background: "none", border: "none", cursor: "pointer" }}>
            Cancel
          </button>
        )}
      </div>

      <div className="mb-3">
        <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", display: "block" }}>What are you saving for?</label>
        <input type="text" placeholder="e.g. Japan trip, new laptop..." value={form.label} onChange={set("label")} style={inputStyle} />
      </div>
      <div className="mb-3">
        <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", display: "block" }}>Target amount ($)</label>
        <input type="number" min="1" placeholder="2000" value={form.targetAmount} onChange={set("targetAmount")} style={inputStyle} />
      </div>
      <div className="mb-3">
        <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", display: "block" }}>Already saved ($)</label>
        <input type="number" min="0" placeholder="0" value={form.savedAmount} onChange={set("savedAmount")} style={inputStyle} />
      </div>
      <div className="mb-4">
        <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", display: "block" }}>
          Target date <span style={{ color: "var(--text-light)", fontWeight: 400 }}>(optional)</span>
        </label>
        <input type="date" value={form.deadline} onChange={set("deadline")} style={inputStyle} />
      </div>

      {error && <p style={{ fontSize: "11px", color: "#b06060", marginBottom: "10px" }}>{error}</p>}

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full text-sm"
        style={{ opacity: saving ? 0.7 : 1 }}>
        {saving ? "Saving..." : "Save Goal ✨"}
      </button>
    </div>
  );

  // ── Display view ──────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl p-5 relative" style={{ background: "linear-gradient(135deg, #a07878, #c4a0a0)", color: "white" }}>
      <button onClick={() => setEditing(true)} style={{
        position: "absolute", top: "14px", right: "14px",
        background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)",
        borderRadius: "20px", padding: "3px 10px",
        fontSize: "11px", color: "white", cursor: "pointer",
      }}>Edit</button>

      <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ opacity: 0.65 }}>Long-term Goal</p>
      <h3 className="text-lg mb-1" style={{ fontFamily: "'Lora\'', serif", fontStyle: "italic", color: "white" }}>
        {goal.label}
      </h3>

      {daysLeft !== null && (
        <p className="text-xs mb-3" style={{ opacity: 0.7 }}>
          {daysLeft > 0 ? `${daysLeft} days to go` : "Deadline reached!"}
        </p>
      )}

      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.25)", marginTop: "12px" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${used}%`, background: "rgba(255,255,255,0.85)" }} />
      </div>

      <div className="flex justify-between text-sm">
        <span className="font-semibold">${saved.toLocaleString()} saved</span>
        <span style={{ opacity: 0.65 }}>${left.toLocaleString()} to go</span>
      </div>

      {target > 0 && (
        <div className="mt-3 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.15)" }}>
          <p className="text-xs font-semibold" style={{ opacity: 0.9 }}>{used}% there</p>
        </div>
      )}

      <p className="text-xs mt-3" style={{ opacity: 0.55, fontStyle: "italic" }}>Every paused purchase brings you closer</p>
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
      Connect Your Bank
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
    { name: "Clothing",      spent: Math.round(totals["Clothing"]),      total: 200 },
    { name: "Food & Drink",  spent: Math.round(totals["Food & Drink"]),  total: 100 },
    { name: "Beauty",        spent: Math.round(totals["Beauty"]),        total: 60 },
    { name: "Entertainment", spent: Math.round(totals["Entertainment"]), total: 50 },
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
  const [editingWage, setEditingWage] = useState(false);
  const [wageInput, setWageInput]     = useState('');

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

  const refreshGoal = async () => {
    const updated = await getUser(userId).catch(() => null);
    if (updated) setUser(updated);
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
          { name: "Clothing",      spent: 0, total: 200},
          { name: "Food & Drink",  spent: 0, total: 100},
          { name: "Beauty",        spent: 0, total: 60},
          { name: "Entertainment", spent: 0, total: 50},
        ];

  const totalSpent  = categories.reduce((sum, c) => sum + c.spent, 0);
  const pausedCount = purchases.filter(p => p.decision === "paused" || p.paused).length;
  const savedAmount = purchases
    .filter(p => p.decision === "paused" || p.paused)
    .reduce((sum, p) => sum + (p.price || p.cost || 0), 0);
  
  const hourlyWage  = user?.hourlyWage || 0;
  const hoursWorked = hourlyWage > 0 ? (savedAmount / hourlyWage).toFixed(1) : null;

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
          <span className="text-lg"> </span>
          <span className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "'Lora', serif", color: "var(--text-primary)" }}>
            ByeBuy
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
              <p className="text-xs mt-4 text-center" style={{ color: "var(--text-light)" }}>Bank connected</p>
            )}
            <BudgetEditor budget={user?.budget} userId={userId} onSaved={refreshGoal} />
          </div>
        </div>

          {/* Goal */}
          <div className="fade-up fade-up-2">
            <GoalCard goal={goal} userId={userId} onSaved={refreshGoal} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 fade-up fade-up-3">
            <StatChip label="Paused" value={pausedCount} sub="this month" bg="var(--petal)" textColor="var(--accent-dark)" />
            <StatChip label="Saved" value={`$${Number(savedAmount).toFixed(2)}`} sub="from pausing" bg="#e8efe8" textColor="#3d6b3d" />
            {hourlyWage > 0 && (
              <StatChip label="Hours of Work" value={hoursWorked} sub={`@ $${hourlyWage}/hr`} bg="#e8eef5" textColor="#3d5a7a" />
              )}
              <div className="rounded-2xl p-4" style={{ background: "#f5f0e8", color: "#7a5a3d" }}>
                {editingWage ? (
                  <div className="flex flex-col gap-1">
                    <input
                      type="number"
                      className="w-full rounded-lg px-2 py-1 text-sm outline-none"
                      style={{ border: "1px solid #c4a882", background: "white", color: "#7a5a3d" }}
                      value={wageInput}
                      autoFocus
                      onChange={e => setWageInput(e.target.value)}
                      onKeyDown={async e => {
                        if (e.key === 'Enter') {
                            await updateUser(userId, { hourlyWage: Number(wageInput) });
                            setUser(prev => ({ ...prev, hourlyWage: Number(wageInput) }));
                            setEditingWage(false);
                      }
                      if (e.key === 'Escape') setEditingWage(false);
                    }}
                    onBlur={async () => {
                      if (wageInput) {
                        await updateUser(userId, { hourlyWage: Number(wageInput) });
                        setUser(prev => ({ ...prev, hourlyWage: Number(wageInput) }));
                      }
                      setEditingWage(false);
                    }}
                    />
                    <p className="text-xs" style={{ opacity: 0.6 }}>press enter to save</p>
                    </div>
                    ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-2xl font-bold" style={{ fontFamily: "'Lora', serif" }}>
                          {hourlyWage > 0 ? `$${hourlyWage}` : '—'}
                          </p>
                          <p className="text-xs font-semibold mt-0.5">Hourly Wage</p>
                          </div>
                          <button
                          onClick={() => { setWageInput(hourlyWage || ''); setEditingWage(true); }}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ background: "rgba(0,0,0,0.06)", color: "#7a5a3d" }}
                          >
                            ✏️
                            </button>
                            </div>
                          )}
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
                  : "No purchases yet — go trigger the extension! "}
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