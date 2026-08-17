import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Settings, X, Trash2, Pencil, RefreshCw, AlertTriangle, Users } from 'lucide-react';

const COLORS = {
  ink: '#1F3B33',
  inkDark: '#132821',
  paper: '#F3EEE1',
  paperSoft: '#EAE2CE',
  line: '#D3C7AA',
  rust: '#BD5B38',
  slate: '#35507A',
  moss: '#4F7A5C',
  danger: '#A6402F',
  muted: '#8A8266',
};

const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'SFMono-Regular', monospace";

const STORAGE_KEY = 'ledger-v1';

function genId() {
  return 'e_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const curYear = new Date().getFullYear();
  return year === curYear ? `${day} ${month}` : `${day} ${month} '${String(year).slice(2)}`;
}

function formatAmount(n, symbol) {
  const num = Math.abs(Number(n) || 0);
  const parts = num.toFixed(2).split('.');
  const intPart = parts[0];
  let grouped;
  if (symbol === '₹') {
    let last3 = intPart.slice(-3);
    let other = intPart.slice(0, -3);
    if (other !== '') {
      other = other.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      grouped = other + ',' + last3;
    } else {
      grouped = last3;
    }
  } else {
    grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  const dec = parts[1];
  return `${symbol}${grouped}${dec !== '00' ? '.' + dec : ''}`;
}

function computeBalances(entries) {
  const sorted = [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
  let running = 0;
  const balMap = {};
  for (const e of sorted) {
    running += e.type === 'topup' ? Number(e.amount) : -Number(e.amount);
    balMap[e.id] = running;
  }
  return { balMap, finalBalance: running };
}

async function loadLedger() {
  try {
    const res = await window.storage.get(STORAGE_KEY, true);
    if (res && res.value) return JSON.parse(res.value);
    return null;
  } catch (e) {
    return null;
  }
}

async function saveLedger(data) {
  try {
    const res = await window.storage.set(STORAGE_KEY, JSON.stringify(data), true);
    return !!res;
  } catch (e) {
    return false;
  }
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      * { box-sizing: border-box; }
      input:focus, select:focus, button:focus-visible, textarea:focus {
        outline: 2px solid ${COLORS.moss};
        outline-offset: 2px;
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .entry-row { animation: fadeInUp 0.35s ease backwards; }
      @media (prefers-reduced-motion: reduce) {
        .entry-row { animation: none !important; }
        * { transition: none !important; }
      }
      .ledger-card { position: relative; }
      .ledger-card .spine-line {
        position: absolute; left: 12px; top: 16px; bottom: 16px; width: 1px;
        background: repeating-linear-gradient(to bottom, transparent, transparent 5px, ${COLORS.line} 5px, ${COLORS.line} 7px);
      }
      .ledger-card .spine-dots {
        position: absolute; left: 6px; top: 16px; bottom: 16px; width: 8px;
        background-image: radial-gradient(circle, ${COLORS.ink} 1.4px, transparent 1.6px);
        background-size: 8px 13px; background-repeat: repeat-y; opacity: 0.3;
      }
      ::selection { background: ${COLORS.moss}; color: #fff; }
      input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.6; }
    `}</style>
  );
}

function PersonBadge({ name, color, size = 22 }) {
  if (name === 'Both') {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: size, height: size, background: COLORS.ink }}
        title="Both"
      >
        <Users size={size * 0.55} color="#fff" strokeWidth={2.2} />
      </span>
    );
  }
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';
  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-shrink-0 font-semibold"
      style={{ width: size, height: size, background: color, color: '#fff', fontSize: size * 0.45, fontFamily: FONT_MONO }}
      title={name}
    >
      {initial}
    </span>
  );
}

function Pill({ active, onClick, children, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 active:scale-95"
      style={{
        background: active ? (color || COLORS.ink) : 'transparent',
        color: active ? '#fff' : COLORS.ink,
        border: `1.5px solid ${active ? (color || COLORS.ink) : COLORS.line}`,
      }}
    >
      {children}
    </button>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: COLORS.inkDark }}>
      <div className="animate-pulse rounded-2xl" style={{ width: 300, height: 180, background: COLORS.paperSoft, opacity: 0.15 }} />
    </div>
  );
}

const fieldStyle = {
  border: `1.5px solid ${COLORS.line}`,
  background: '#fff',
  color: COLORS.ink,
  outline: 'none',
};

function Onboarding({ onSubmit }) {
  const [partnerA, setPartnerA] = useState('');
  const [partnerB, setPartnerB] = useState('');
  const [pot, setPot] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!partnerA.trim() || !partnerB.trim()) {
      setError('Enter both names to continue.');
      return;
    }
    const potNum = Number(pot) || 0;
    if (potNum < 0) {
      setError("Starting pot can't be negative.");
      return;
    }
    onSubmit(
      { partnerA: partnerA.trim(), partnerB: partnerB.trim(), currency: currency.trim() || '₹', createdAt: todayStr() },
      potNum
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: COLORS.inkDark, fontFamily: FONT_BODY }}>
      <GlobalStyle />
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl p-6" style={{ background: COLORS.paper, boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <div className="text-xs font-semibold uppercase mb-1" style={{ color: COLORS.moss, letterSpacing: '0.12em' }}>New ledger</div>
        <h1 className="text-2xl mb-1" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink, fontWeight: 600 }}>Let's set up your ledger</h1>
        <p className="text-sm mb-5" style={{ color: COLORS.muted }}>Two names, one pot. Every rupee either of you spends gets logged here.</p>

        <label className="block text-xs font-medium mb-1" style={{ color: COLORS.ink }}>Partner 1 name</label>
        <input value={partnerA} onChange={e => setPartnerA(e.target.value)} placeholder="e.g. Ashish" className="w-full mb-4 px-3 py-2 rounded-lg text-sm" style={fieldStyle} />

        <label className="block text-xs font-medium mb-1" style={{ color: COLORS.ink }}>Partner 2 name</label>
        <input value={partnerB} onChange={e => setPartnerB(e.target.value)} placeholder="e.g. Partner" className="w-full mb-4 px-3 py-2 rounded-lg text-sm" style={fieldStyle} />

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: COLORS.ink }}>Starting pot</label>
            <input value={pot} onChange={e => setPot(e.target.value)} type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" className="w-full px-3 py-2 rounded-lg text-sm" style={{ ...fieldStyle, fontFamily: FONT_MONO }} />
          </div>
          <div style={{ width: 84 }}>
            <label className="block text-xs font-medium mb-1" style={{ color: COLORS.ink }}>Currency</label>
            <input value={currency} onChange={e => setCurrency(e.target.value)} maxLength={3} className="w-full px-3 py-2 rounded-lg text-sm text-center" style={{ ...fieldStyle, fontFamily: FONT_MONO, width: 84 }} />
          </div>
        </div>

        {error && (
          <div className="text-xs mb-3 flex items-center gap-1" style={{ color: COLORS.danger }}>
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        <button type="submit" className="w-full py-2.5 rounded-lg text-sm font-semibold transition-transform active:scale-95" style={{ background: COLORS.ink, color: '#fff' }}>
          Open our ledger
        </button>
      </form>
    </div>
  );
}

function BalanceCard({ ledger, finalBalance, totalInvested, totalSpent, spentA, spentB, pctA, pctB, spentTotal }) {
  const [animBal, setAnimBal] = useState(0);

  useEffect(() => {
    let raf;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setAnimBal(finalBalance); return; }
    const start = performance.now();
    const dur = 700;
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimBal(finalBalance * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finalBalance]);

  const balColor = finalBalance < 0 ? COLORS.danger : COLORS.ink;
  const balSign = finalBalance < 0 ? '\u2212' : '';

  return (
    <div className="ledger-card rounded-2xl pl-8 pr-5 py-5 mb-4" style={{ background: COLORS.paper, boxShadow: '0 10px 30px rgba(19,40,33,0.25)' }}>
      <div className="spine-line" /><div className="spine-dots" />
      <div className="text-xs font-semibold uppercase mb-2" style={{ color: COLORS.moss, letterSpacing: '0.12em' }}>Pot balance</div>
      <div className="text-4xl mb-1" style={{ fontFamily: FONT_MONO, fontWeight: 600, color: balColor, fontVariantNumeric: 'tabular-nums' }}>
        {balSign}{formatAmount(animBal, ledger.currency)}
      </div>
      <div className="text-xs mb-4" style={{ color: COLORS.muted, fontFamily: FONT_MONO }}>
        invested {formatAmount(totalInvested, ledger.currency)} &middot; spent {formatAmount(totalSpent, ledger.currency)}
      </div>

      {spentTotal > 0 ? (
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: COLORS.ink }}>
            <span className="flex items-center gap-1.5"><PersonBadge name={ledger.partnerA} color={COLORS.rust} size={16} /> {formatAmount(spentA, ledger.currency)}</span>
            <span className="flex items-center gap-1.5">{formatAmount(spentB, ledger.currency)} <PersonBadge name={ledger.partnerB} color={COLORS.slate} size={16} /></span>
          </div>
          <div className="flex rounded-full overflow-hidden" style={{ height: 6, background: COLORS.paperSoft }}>
            <div style={{ width: pctA + '%', background: COLORS.rust }} />
            <div style={{ width: pctB + '%', background: COLORS.slate }} />
          </div>
        </div>
      ) : (
        <div className="text-xs" style={{ color: COLORS.muted }}>No individual expenses logged yet.</div>
      )}
    </div>
  );
}

function EntryRow({ entry, index, balance, expanded, confirming, onToggle, onEdit, onDeleteRequest, onDeleteCancel, onDeleteConfirm, currency, partnerA, partnerB }) {
  const isExpense = entry.type === 'expense';
  const personColor = entry.person === partnerA ? COLORS.rust : entry.person === partnerB ? COLORS.slate : COLORS.ink;
  return (
    <div className="entry-row py-3" style={{ borderBottom: `1px dashed ${COLORS.line}`, animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex justify-between items-baseline gap-3">
          <span className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>{entry.purpose || (isExpense ? 'Expense' : 'Top-up')}</span>
          <span className="text-sm font-semibold flex-shrink-0" style={{ fontFamily: FONT_MONO, color: isExpense ? COLORS.danger : COLORS.moss, fontVariantNumeric: 'tabular-nums' }}>
            {isExpense ? '\u2212' : '+'}{formatAmount(entry.amount, currency)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <span className="flex items-center gap-1.5">
            <PersonBadge name={entry.person} color={personColor} size={16} />
            <span className="text-xs" style={{ color: COLORS.muted, fontFamily: FONT_MONO }}>{formatDate(entry.date)}</span>
          </span>
          <span className="text-xs" style={{ color: COLORS.muted, fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums' }}>
            bal {formatAmount(balance, currency)}
          </span>
        </div>
      </button>

      {expanded && !confirming && (
        <div className="flex gap-2 mt-3">
          <button onClick={onEdit} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-transform active:scale-95" style={{ border: `1.5px solid ${COLORS.line}`, color: COLORS.ink }}>
            <Pencil size={12} /> Edit
          </button>
          <button onClick={onDeleteRequest} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-transform active:scale-95" style={{ border: `1.5px solid ${COLORS.danger}`, color: COLORS.danger }}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
      {confirming && (
        <div className="flex items-center gap-2 mt-3 text-xs flex-wrap" style={{ color: COLORS.danger }}>
          <span className="font-medium">Delete this entry?</span>
          <button onClick={onDeleteConfirm} className="px-3 py-1 rounded-full font-semibold" style={{ background: COLORS.danger, color: '#fff' }}>Yes, delete</button>
          <button onClick={onDeleteCancel} className="px-3 py-1 rounded-full font-semibold" style={{ border: `1.5px solid ${COLORS.line}`, color: COLORS.ink }}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function EntryModal({ ledger, initial, onCancel, onSave, onDelete }) {
  const [type, setType] = useState(initial?.type || 'expense');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [purpose, setPurpose] = useState(initial?.purpose || '');
  const [person, setPerson] = useState(initial?.person || ledger.partnerA);
  const [date, setDate] = useState(initial?.date || todayStr());
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Enter an amount greater than 0.'); return; }
    if (type === 'expense' && !purpose.trim()) { setError('Add a short purpose for this expense.'); return; }
    onSave({ type, amount: amt, purpose: purpose.trim() || (type === 'topup' ? 'Top-up' : ''), person, date });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(19,40,33,0.55)' }}>
      <form onSubmit={submit} className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6" style={{ background: COLORS.paper, maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg" style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, color: COLORS.ink }}>{initial ? 'Edit entry' : 'Add entry'}</h2>
          <button type="button" onClick={onCancel} className="p-1 rounded-full" aria-label="Close"><X size={18} color={COLORS.muted} /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <Pill active={type === 'expense'} onClick={() => setType('expense')} color={COLORS.danger}>Expense</Pill>
          <Pill active={type === 'topup'} onClick={() => setType('topup')} color={COLORS.moss}>Top-up</Pill>
        </div>

        <label className="block text-xs font-medium mb-1" style={{ color: COLORS.ink }}>Amount</label>
        <div className="flex items-center mb-4 rounded-lg overflow-hidden" style={{ border: `1.5px solid ${COLORS.line}`, background: '#fff' }}>
          <span className="px-3 text-sm" style={{ color: COLORS.muted, fontFamily: FONT_MONO }}>{ledger.currency}</span>
          <input
            value={amount} onChange={e => setAmount(e.target.value)}
            type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" autoFocus
            className="flex-1 py-2 pr-3 text-sm"
            style={{ border: 'none', outline: 'none', fontFamily: FONT_MONO, color: COLORS.ink, background: 'transparent' }}
          />
        </div>

        <label className="block text-xs font-medium mb-1" style={{ color: COLORS.ink }}>{type === 'expense' ? 'What was it for?' : 'Note (optional)'}</label>
        <input
          value={purpose} onChange={e => setPurpose(e.target.value)}
          placeholder={type === 'expense' ? 'e.g. Groceries' : 'e.g. Monthly savings'}
          className="w-full mb-4 px-3 py-2 rounded-lg text-sm" style={fieldStyle}
        />

        <label className="block text-xs font-medium mb-1.5" style={{ color: COLORS.ink }}>{type === 'expense' ? 'Paid by' : 'Added by'}</label>
        <div className="flex gap-2 mb-4">
          <Pill active={person === ledger.partnerA} onClick={() => setPerson(ledger.partnerA)} color={COLORS.rust}>{ledger.partnerA}</Pill>
          <Pill active={person === ledger.partnerB} onClick={() => setPerson(ledger.partnerB)} color={COLORS.slate}>{ledger.partnerB}</Pill>
          <Pill active={person === 'Both'} onClick={() => setPerson('Both')}>Both</Pill>
        </div>

        <label className="block text-xs font-medium mb-1" style={{ color: COLORS.ink }}>Date</label>
        <input value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full mb-4 px-3 py-2 rounded-lg text-sm" style={{ ...fieldStyle, fontFamily: FONT_MONO }} />

        {error && (
          <div className="text-xs mb-3 flex items-center gap-1" style={{ color: COLORS.danger }}>
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        <div className="flex gap-2">
          {onDelete && (
            <button type="button" onClick={onDelete} className="p-2.5 rounded-lg transition-transform active:scale-95" style={{ border: `1.5px solid ${COLORS.danger}` }} aria-label="Delete entry">
              <Trash2 size={16} color={COLORS.danger} />
            </button>
          )}
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-transform active:scale-95" style={{ border: `1.5px solid ${COLORS.line}`, color: COLORS.ink }}>Cancel</button>
          <button type="submit" className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-transform active:scale-95" style={{ background: COLORS.ink, color: '#fff' }}>Save</button>
        </div>
      </form>
    </div>
  );
}

function SettingsModal({ ledger, onCancel, onSave, onReset }) {
  const [partnerA, setPartnerA] = useState(ledger.partnerA);
  const [partnerB, setPartnerB] = useState(ledger.partnerB);
  const [currency, setCurrency] = useState(ledger.currency);
  const [confirmingReset, setConfirmingReset] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (!partnerA.trim() || !partnerB.trim()) return;
    onSave({ ...ledger, partnerA: partnerA.trim(), partnerB: partnerB.trim(), currency: currency.trim() || '₹' });
    onCancel();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(19,40,33,0.55)' }}>
      <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6" style={{ background: COLORS.paper, maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg" style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, color: COLORS.ink }}>Settings</h2>
          <button onClick={onCancel} className="p-1 rounded-full" aria-label="Close"><X size={18} color={COLORS.muted} /></button>
        </div>

        <form onSubmit={submit}>
          <label className="block text-xs font-medium mb-1" style={{ color: COLORS.ink }}>Partner 1 name</label>
          <input value={partnerA} onChange={e => setPartnerA(e.target.value)} className="w-full mb-3 px-3 py-2 rounded-lg text-sm" style={fieldStyle} />

          <label className="block text-xs font-medium mb-1" style={{ color: COLORS.ink }}>Partner 2 name</label>
          <input value={partnerB} onChange={e => setPartnerB(e.target.value)} className="w-full mb-3 px-3 py-2 rounded-lg text-sm" style={fieldStyle} />

          <label className="block text-xs font-medium mb-1" style={{ color: COLORS.ink }}>Currency symbol</label>
          <input value={currency} onChange={e => setCurrency(e.target.value)} maxLength={3} className="mb-5 px-3 py-2 rounded-lg text-sm" style={{ ...fieldStyle, fontFamily: FONT_MONO, width: 84 }} />

          <button type="submit" className="w-full py-2.5 rounded-lg text-sm font-semibold mb-5 transition-transform active:scale-95" style={{ background: COLORS.ink, color: '#fff' }}>Save changes</button>
        </form>

        <div className="pt-4" style={{ borderTop: `1px dashed ${COLORS.line}` }}>
          <div className="text-xs mb-3 flex items-start gap-1.5" style={{ color: COLORS.muted }}>
            <Users size={13} style={{ marginTop: 1, flexShrink: 0 }} />
            This ledger is shared &mdash; anyone with this artifact's link can view and add entries.
          </div>
          {!confirmingReset ? (
            <button type="button" onClick={() => setConfirmingReset(true)} className="text-xs font-semibold flex items-center gap-1.5" style={{ color: COLORS.danger }}>
              <Trash2 size={13} /> Reset ledger
            </button>
          ) : (
            <div className="text-xs" style={{ color: COLORS.danger }}>
              <div className="mb-2 font-medium">This deletes every entry, for both of you. Are you sure?</div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={onReset} className="px-3 py-1.5 rounded-full font-semibold" style={{ background: COLORS.danger, color: '#fff' }}>Yes, reset everything</button>
                <button type="button" onClick={() => setConfirmingReset(false)} className="px-3 py-1.5 rounded-full font-semibold" style={{ border: `1.5px solid ${COLORS.line}`, color: COLORS.ink }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState(null);
  const [entries, setEntries] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const modalOpenRef = useRef(false);

  useEffect(() => {
    (async () => {
      const data = await loadLedger();
      if (data) {
        setLedger(data.meta);
        setEntries(data.entries || []);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    modalOpenRef.current = showAdd || showSettings;
  }, [showAdd, showSettings]);

  useEffect(() => {
    if (!ledger) return;
    const interval = setInterval(async () => {
      if (modalOpenRef.current) return;
      const data = await loadLedger();
      if (data) {
        setLedger(prev => (JSON.stringify(prev) === JSON.stringify(data.meta) ? prev : data.meta));
        setEntries(prev => (JSON.stringify(prev) === JSON.stringify(data.entries) ? prev : (data.entries || [])));
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [ledger]);

  const persist = useCallback(async (nextMeta, nextEntries) => {
    await saveLedger({ meta: nextMeta, entries: nextEntries });
  }, []);

  async function handleOnboard(meta, initialPot) {
    const newEntries = [];
    if (initialPot > 0) {
      newEntries.push({ id: genId(), type: 'topup', amount: initialPot, purpose: 'Starting pot', person: 'Both', date: todayStr(), createdAt: Date.now() });
    }
    setLedger(meta);
    setEntries(newEntries);
    await persist(meta, newEntries);
  }

  async function handleSaveEntry(entry) {
    let next;
    if (editingEntry) {
      next = entries.map(e => (e.id === editingEntry.id ? { ...entry, id: editingEntry.id, createdAt: editingEntry.createdAt } : e));
    } else {
      next = [...entries, { ...entry, id: genId(), createdAt: Date.now() }];
    }
    setEntries(next);
    setShowAdd(false);
    setEditingEntry(null);
    await persist(ledger, next);
  }

  async function handleDelete(id) {
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    setConfirmDeleteId(null);
    setExpandedId(null);
    setShowAdd(false);
    setEditingEntry(null);
    await persist(ledger, next);
  }

  async function handleUpdateMeta(newMeta) {
    setLedger(newMeta);
    await persist(newMeta, entries);
  }

  async function handleReset() {
    try { await window.storage.delete(STORAGE_KEY, true); } catch (e) {}
    setLedger(null);
    setEntries([]);
    setShowSettings(false);
  }

  async function manualRefresh() {
    setRefreshing(true);
    const data = await loadLedger();
    if (data) {
      setLedger(data.meta);
      setEntries(data.entries || []);
    }
    setTimeout(() => setRefreshing(false), 500);
  }

  if (loading) return <LoadingScreen />;
  if (!ledger) return <Onboarding onSubmit={handleOnboard} />;

  const { balMap, finalBalance } = computeBalances(entries);
  const totalInvested = entries.filter(e => e.type === 'topup').reduce((s, e) => s + Number(e.amount), 0);
  const totalSpent = entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
  const spentA = entries.filter(e => e.type === 'expense' && e.person === ledger.partnerA).reduce((s, e) => s + Number(e.amount), 0);
  const spentB = entries.filter(e => e.type === 'expense' && e.person === ledger.partnerB).reduce((s, e) => s + Number(e.amount), 0);
  const spentTotal = spentA + spentB;
  const pctA = spentTotal > 0 ? (spentA / spentTotal) * 100 : 50;
  const pctB = spentTotal > 0 ? (spentB / spentTotal) * 100 : 50;

  const filtered = entries.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'topup') return e.type === 'topup';
    if (filter === 'A') return e.person === ledger.partnerA;
    if (filter === 'B') return e.person === ledger.partnerB;
    return true;
  });
  const sortedDesc = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return a.date > b.date ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="min-h-screen w-full pb-28" style={{ background: COLORS.inkDark, fontFamily: FONT_BODY }}>
      <GlobalStyle />
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-xs font-semibold uppercase" style={{ color: COLORS.paperSoft, letterSpacing: '0.14em', opacity: 0.7 }}>
              Joint ledger &middot; est. {formatDate(ledger.createdAt)}
            </div>
            <h1 className="text-xl mt-0.5" style={{ fontFamily: FONT_DISPLAY, color: COLORS.paper, fontWeight: 600 }}>
              {ledger.partnerA} &amp; {ledger.partnerB}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={manualRefresh} className="p-2 rounded-full transition-transform active:scale-90" style={{ background: 'rgba(243,238,225,0.1)' }} aria-label="Refresh">
              <RefreshCw size={16} color={COLORS.paper} style={{ animation: refreshing ? 'spin 0.6s linear' : 'none' }} />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-full transition-transform active:scale-90" style={{ background: 'rgba(243,238,225,0.1)' }} aria-label="Settings">
              <Settings size={16} color={COLORS.paper} />
            </button>
          </div>
        </div>

        <BalanceCard ledger={ledger} finalBalance={finalBalance} totalInvested={totalInvested} totalSpent={totalSpent} spentA={spentA} spentB={spentB} pctA={pctA} pctB={pctB} spentTotal={spentTotal} />

        <div className="flex gap-2 mb-3 overflow-x-auto">
          <Pill active={filter === 'all'} onClick={() => setFilter('all')}>All</Pill>
          <Pill active={filter === 'A'} onClick={() => setFilter('A')} color={COLORS.rust}>{ledger.partnerA}</Pill>
          <Pill active={filter === 'B'} onClick={() => setFilter('B')} color={COLORS.slate}>{ledger.partnerB}</Pill>
          <Pill active={filter === 'topup'} onClick={() => setFilter('topup')} color={COLORS.moss}>Top-ups</Pill>
        </div>

        <div className="ledger-card rounded-2xl pl-8 pr-4 py-2 mb-6" style={{ background: COLORS.paper, boxShadow: '0 10px 30px rgba(19,40,33,0.2)' }}>
          <div className="spine-line" /><div className="spine-dots" />
          {sortedDesc.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: COLORS.muted }}>
              {filter === 'all' ? 'No entries yet. Add your first one below.' : 'Nothing here yet.'}
            </div>
          ) : (
            sortedDesc.map((e, i) => (
              <EntryRow
                key={e.id}
                entry={e}
                index={i}
                balance={balMap[e.id]}
                expanded={expandedId === e.id}
                confirming={confirmDeleteId === e.id}
                onToggle={() => setExpandedId(expandedId === e.id ? null : e.id)}
                onEdit={() => { setEditingEntry(e); setShowAdd(true); }}
                onDeleteRequest={() => setConfirmDeleteId(e.id)}
                onDeleteCancel={() => setConfirmDeleteId(null)}
                onDeleteConfirm={() => handleDelete(e.id)}
                currency={ledger.currency}
                partnerA={ledger.partnerA}
                partnerB={ledger.partnerB}
              />
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => { setEditingEntry(null); setShowAdd(true); }}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm transition-transform active:scale-95 z-40"
        style={{ background: COLORS.ink, color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
      >
        <Plus size={18} /> Add entry
      </button>

      {showAdd && (
        <EntryModal
          ledger={ledger}
          initial={editingEntry}
          onCancel={() => { setShowAdd(false); setEditingEntry(null); }}
          onSave={handleSaveEntry}
          onDelete={editingEntry ? () => handleDelete(editingEntry.id) : null}
        />
      )}

      {showSettings && (
        <SettingsModal ledger={ledger} onCancel={() => setShowSettings(false)} onSave={handleUpdateMeta} onReset={handleReset} />
      )}
    </div>
  );
}
