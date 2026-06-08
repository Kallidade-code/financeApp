import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from "recharts";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API = "http://localhost:5197";
const ROTAS = { transacoes: "/finance", categorias: "/categoria" };
const POLLING_MS = 5000;             // atualiza a cada 5 segundos

// ─── CORES ───────────────────────────────────────────────────────────────────
const CATEGORY_COLORS = [
  "#add500", "#ddb7ff", "#c8c6c5", "#ffb4ab",
  "#7dd3fc", "#fcd34d", "#6ee7b7", "#f9a8d4",
];

const iconColors = {
  secondary: "bg-[#6f00be]/10 text-[#ddb7ff] border border-[#ddb7ff]/20",
  tertiary:  "bg-[#c8c6c5]/10 text-[#c8c6c5] border border-[#c8c6c5]/20",
  primary:   "bg-[#add500]/10 text-[#add500] border border-[#add500]/20 shadow-[0_0_10px_rgba(198,243,17,0.1)]",
};

const MESES = [
  "Janeiro","Fevereiro","Março","Abril",
  "Maio","Junho","Julho","Agosto",
  "Setembro","Outubro","Novembro","Dezembro",
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(Math.abs(valor));
}

function iconeParaCategoria(nome = "") {
  const n = nome.toLowerCase();
  if (n.includes("aliment") || n.includes("restaur") || n.includes("comida")) return "restaurant";
  if (n.includes("transport") || n.includes("uber") || n.includes("combustiv")) return "directions_car";
  if (n.includes("moradia") || n.includes("aluguel") || n.includes("condomin")) return "home";
  if (n.includes("salário") || n.includes("salario") || n.includes("pagamento")) return "payments";
  if (n.includes("saúde") || n.includes("saude") || n.includes("médic")) return "local_hospital";
  if (n.includes("lazer") || n.includes("entret")) return "sports_esports";
  return "attach_money";
}

function corParaCategoria(nome = "") {
  const n = nome.toLowerCase();
  if (n.includes("aliment") || n.includes("restaur")) return "secondary";
  if (n.includes("transport")) return "tertiary";
  return "primary";
}

function agruparPorData(transacoes) {
  const grupos = {};
  transacoes.forEach((t) => {
    const data = new Date(t.data || Date.now());
    const hoje = new Date();
    const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    let chave;
    if (data.toDateString() === hoje.toDateString()) chave = "Hoje";
    else if (data.toDateString() === ontem.toDateString()) chave = "Ontem";
    else chave = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(t);
  });
  return grupos;
}

function montarDadosDiarios(transacoes) {
  const dias = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const chave = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    dias[chave] = { dia: chave, entradas: 0, saidas: 0 };
  }
  transacoes.forEach((t) => {
    const data = new Date(t.data || Date.now());
    const chave = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    if (dias[chave]) {
      const val = Number(t.valor ?? 0);
      if (t.tipo === 1) dias[chave].entradas += val;   // Receita
      else              dias[chave].saidas   += val;   // Despesa
    }
  });
  return Object.values(dias);
}

function montarDadosCategorias(transacoes, categorias) {
  const mapa = {};
  transacoes.forEach((t) => {
    if (t.tipo !== 2) return; // só Despesas
    const val = Number(t.valor ?? 0);
    const catId = t.categoriaId ?? t.categoria?.id;
    const cat = categorias.find((c) => c.id === catId);
    const nome = cat?.nome ?? t.categoria?.nome ?? "Outros";
    mapa[nome] = (mapa[nome] || 0) + val;
  });
  return Object.entries(mapa).map(([nome, valor]) => ({ nome, valor }));
}

// ─── TOOLTIPS ────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#201f1f", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "#e5e2e1" }}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#201f1f", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "#e5e2e1" }}>
      <div style={{ color: payload[0].payload.fill }}>{payload[0].name}</div>
      <div>{fmt(payload[0].value)}</div>
    </div>
  );
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function ModalLancamento({ categorias, onClose, onSucesso }) {
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("saida");
  const [categoriaId, setCategoriaId] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function cadastrar() {
    if (!valor || !categoriaId) { setErro("Preencha todos os campos."); return; }
    setLoading(true); setErro("");
    try {
      const res = await fetch(`${API}${ROTAS.transacoes}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipo === "entrada" ? 1 : 2,          // 1=Receita, 2=Despesa
          valor: Math.abs(Number(valor)),             // sempre positivo
          categoriaId: Number(categoriaId),
          data: new Date(data).toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar.");
      onSucesso(); onClose();
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5 border border-white/10" style={{ background: "#1c1b1b" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ fontFamily: "Hanken Grotesk" }}>Novo Lançamento</h2>
          <button onClick={onClose} style={{ color: "#c4c9ad" }}><span className="mat-icon">close</span></button>
        </div>

        <div className="flex gap-2">
          {["entrada", "saida"].map((t) => (
            <button key={t} onClick={() => setTipo(t)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all border"
              style={tipo === t
                ? t === "entrada"
                  ? { background: "rgba(173,213,0,.15)", color: "#add500", borderColor: "rgba(173,213,0,.3)" }
                  : { background: "rgba(255,180,171,.15)", color: "#ffb4ab", borderColor: "rgba(255,180,171,.3)" }
                : { borderColor: "rgba(255,255,255,.1)", color: "#c4c9ad" }
              }
            >
              {t === "entrada" ? "↓ Entrada" : "↑ Saída"}
            </button>
          ))}
        </div>

        {[
          { label: "Valor (R$)", value: valor, set: setValor, type: "number", placeholder: "0,00" },
        ].map(({ label, value, set, type, placeholder }) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "#c4c9ad" }}>{label}</label>
            <input type={type} placeholder={placeholder} value={value} onChange={(e) => set(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none border border-white/10 transition-colors"
              style={{ background: "#131313", color: "#e5e2e1" }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(173,213,0,.4)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,.1)")}
            />
          </div>
        ))}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "#c4c9ad" }}>Categoria</label>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none border border-white/10"
            style={{ background: "#131313", color: categoriaId ? "#e5e2e1" : "#c4c9ad" }}
          >
            <option value="">Selecione uma categoria</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "#c4c9ad" }}>Data</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none border border-white/10"
            style={{ background: "#131313", color: "#e5e2e1", colorScheme: "dark" }}
          />
        </div>

        {erro && <p className="text-xs" style={{ color: "#ffb4ab" }}>{erro}</p>}

        <button onClick={cadastrar} disabled={loading}
          className="w-full py-3 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
          style={{ background: "#c6f311", color: "#293500" }}
        >
          {loading ? "Salvando..." : "Cadastrar Lançamento"}
        </button>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Extrato() {
  const mesAtual = new Date().getMonth();
  const [mesSelecionado, setMesSelecionado] = useState(MESES[mesAtual]);
  const [navAberta, setNavAberta] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [transacoes, setTransacoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const buscarDados = useCallback(async () => {
    try {
      const [resT, resC] = await Promise.all([
        fetch(`${API}${ROTAS.transacoes}`),
        fetch(`${API}${ROTAS.categorias}`),
      ]);
      if (!resT.ok || !resC.ok) throw new Error("Erro ao buscar dados.");
      const [dataT, dataC] = await Promise.all([resT.json(), resC.json()]);
      setTransacoes(dataT);
      setCategorias(dataC);
      setErro("");
    } catch (e) {
      setErro("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buscarDados();
    const interval = setInterval(buscarDados, POLLING_MS);
    return () => clearInterval(interval);
  }, [buscarDados]);

  const mesIdx = MESES.indexOf(mesSelecionado);
  const transacoesMes = transacoes.filter((t) => {
    const d = new Date(t.data || Date.now());
    return d.getMonth() === mesIdx;
  });

  const entradas = transacoesMes.filter((t) => t.tipo === 1).reduce((acc, t) => acc + Number(t.valor ?? 0), 0);
  const saidas   = transacoesMes.filter((t) => t.tipo === 2).reduce((acc, t) => acc + Number(t.valor ?? 0), 0);
  const saldo    = entradas - saidas;

  const dadosPie  = montarDadosCategorias(transacoesMes, categorias);
  const dadosArea = montarDadosDiarios(transacoesMes);
  const grupos    = agruparPorData([...transacoesMes].sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0)));

  return (
    <div className="flex" style={{ background: "#131313", color: "#e5e2e1", fontFamily: "Manrope, sans-serif", minHeight: "100vh", width: "100vw" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Hanken+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .mat-icon { font-family:'Material Symbols Outlined'; font-weight:normal; font-style:normal; display:inline-block; line-height:1; text-transform:none; letter-spacing:normal; user-select:none; }
        .mat-filled { font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24; }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:#353534; border-radius:4px; }
        input[type=date]::-webkit-calendar-picker-indicator { filter:invert(1); opacity:.5; }
        select option { background:#1c1b1b; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      {/* SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 z-40 flex flex-col py-8 border-r border-white/5 transition-transform duration-300 ${navAberta ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "#201f1f" }}
      >
        <div className="px-6 mb-10 flex flex-col gap-4">
          <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Hanken Grotesk", color: "#fff" }}>FinTech Pro</span>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5" style={{ background: "rgba(53,53,52,.5)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10" style={{ background: "#353534" }}>
              <span className="mat-icon mat-filled" style={{ color: "#c4c9ad" }}>person</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium" style={{ color: "#e5e2e1" }}>Carteira</span>
              <span className="text-xs font-medium" style={{ color: "#add500", letterSpacing: ".05em" }}>Premium Plan</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-4">
          {[
            { icon: "dashboard", label: "Dashboard", active: false },
            { icon: "account_balance_wallet", label: "Extrato", active: true },
            { icon: "trending_up", label: "Investimentos", active: false },
            { icon: "credit_card", label: "Cartões", active: false },
          ].map(({ icon, label, active }) => (
            <a key={label} href="#"
              className="mx-2 my-0.5 flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors"
              style={active ? { background: "#c6f311", color: "#293500" } : { color: "#c4c9ad" }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#353534"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              <span className={`mat-icon ${active ? "mat-filled" : ""}`}>{icon}</span>
              {label}
            </a>
          ))}
          <a href="#" className="mx-2 my-0.5 flex items-center gap-3 p-3 rounded-lg text-sm font-medium mt-auto transition-colors" style={{ color: "#c4c9ad" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#353534")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span className="mat-icon">settings</span>Configurações
          </a>
        </nav>

        <div className="px-6 mt-6">
          <button className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-white/10 transition-colors" style={{ color: "#e5e2e1" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#353534")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span className="mat-icon" style={{ color: "#add500" }}>star</span>Upgrade Pro
          </button>
        </div>
      </aside>

      {navAberta && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setNavAberta(false)} />}

      {/* MAIN */}
      <main className="flex-1 flex flex-col lg:ml-64 min-w-0">

        {/* top bar */}
        <div className="px-12 w-full">
          <header className="mt-4 sticky top-4 z-20 flex justify-between items-center px-4 py-2 rounded-xl border border-white/10"
            style={{ background: "rgba(19,19,19,.8)", backdropFilter: "blur(12px)", boxShadow: "0 0 20px rgba(173,213,0,.05)" }}
          >
            <button className="lg:hidden p-2 rounded-lg" onClick={() => setNavAberta(true)}>
              <span className="mat-icon" style={{ color: "#c4c9ad" }}>menu</span>
            </button>
            <span className="font-bold text-xl lg:hidden" style={{ fontFamily: "Hanken Grotesk", color: "#fff" }}>FinTech Pro</span>
            <div className="hidden lg:block flex-1" />

            <div className="flex items-center gap-2 mr-4">
              <div className="w-2 h-2 rounded-full" style={{ background: erro ? "#ffb4ab" : "#add500", boxShadow: erro ? "0 0 6px #ffb4ab" : "0 0 6px #add500", animation: "pulse 2s infinite" }} />
              <span className="text-xs hidden sm:inline" style={{ color: "#c4c9ad" }}>{erro ? "Offline" : "Ao vivo"}</span>
            </div>

            <button onClick={() => setModalAberto(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
              style={{ background: "#c6f311", color: "#293500" }}
            >
              <span className="mat-icon text-lg">add</span>
              <span className="hidden sm:inline">Lançamento Manual</span>
            </button>
          </header>
        </div>

        {/* conteúdo */}
        <div className="flex-1 px-12 py-8 w-full space-y-10">

          {/* título + meses */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight" style={{ fontFamily: "Hanken Grotesk" }}>Movimentações</h1>
              <p className="mt-1 text-sm" style={{ color: "#c4c9ad" }}>Acompanhe seus gastos e recebimentos detalhados.</p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {MESES.map((m) => (
                <button key={m} onClick={() => setMesSelecionado(m)}
                  className="px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
                  style={mesSelecionado === m
                    ? { background: "#2a2a2a", color: "#add500", border: "1px solid rgba(173,213,0,.3)", boxShadow: "0 0 10px rgba(198,243,17,.1)" }
                    : { border: "1px solid rgba(255,255,255,.1)", color: "#c4c9ad" }
                  }
                >{m}</button>
              ))}
            </div>
          </div>

          {/* banner de erro */}
          {erro && (
            <div className="rounded-xl p-4 border flex items-center gap-3"
              style={{ background: "rgba(255,180,171,.05)", borderColor: "rgba(255,180,171,.2)", color: "#ffb4ab" }}>
              <span className="mat-icon">wifi_off</span>
              <span className="text-sm">{erro}</span>
            </div>
          )}

          {/* bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* saldo */}
            <div className="md:col-span-3 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden border border-white/10" style={{ background: "#0e0e0e" }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(173,213,0,.05)", marginRight: "-2.5rem", marginTop: "-2.5rem" }} />
              <div>
                <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "#c4c9ad" }}>Saldo do Período</span>
                {loading
                  ? <div className="mt-2 h-10 w-40 rounded-lg animate-pulse" style={{ background: "#353534" }} />
                  : <div className="mt-2 text-4xl font-semibold tracking-tight" style={{ fontFamily: "Hanken Grotesk", color: saldo >= 0 ? "#e5e2e1" : "#ffb4ab" }}>{fmt(saldo)}</div>
                }
              </div>
              <div className="mt-8 flex gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(173,213,0,.1)", color: "#add500" }}>
                    <span className="mat-icon text-sm">arrow_downward</span>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: "#c4c9ad" }}>Entradas</div>
                    <div className="text-sm font-medium" style={{ color: "#add500" }}>{fmt(entradas)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,180,171,.1)", color: "#ffb4ab" }}>
                    <span className="mat-icon text-sm">arrow_upward</span>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: "#c4c9ad" }}>Saídas</div>
                    <div className="text-sm font-medium" style={{ color: "#ffb4ab" }}>{fmt(saidas)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* area chart */}
            <div className="md:col-span-5 rounded-2xl p-6 flex flex-col gap-4 border border-white/10" style={{ background: "#0e0e0e" }}>
              <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "#c4c9ad" }}>Entradas x Saídas — últimos 7 dias</span>
              {loading
                ? <div className="flex-1 rounded-lg animate-pulse" style={{ background: "#353534", minHeight: 120 }} />
                : <ResponsiveContainer width="100%" height={130}>
                    <AreaChart data={dadosArea} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradEntrada" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#add500" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#add500" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradSaida" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ffb4ab" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#ffb4ab" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                      <XAxis dataKey="dia" tick={{ fill: "#c4c9ad", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#c4c9ad", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#add500" strokeWidth={2} fill="url(#gradEntrada)" dot={false} />
                      <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#ffb4ab" strokeWidth={2} fill="url(#gradSaida)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
              }
            </div>

            {/* pie chart */}
            <div className="md:col-span-4 rounded-2xl p-6 flex flex-col gap-4 border border-white/10" style={{ background: "#0e0e0e" }}>
              <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "#c4c9ad" }}>Gastos por Categoria</span>
              {loading
                ? <div className="flex-1 rounded-lg animate-pulse" style={{ background: "#353534", minHeight: 120 }} />
                : dadosPie.length === 0
                  ? <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "#c4c9ad" }}>Nenhuma saída no período</div>
                  : <>
                      <ResponsiveContainer width="100%" height={120}>
                        <PieChart>
                          <Pie data={dadosPie} dataKey="valor" nameKey="nome" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
                            {dadosPie.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<PieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {dadosPie.map((d, i) => {
                          const total = dadosPie.reduce((a, b) => a + b.valor, 0);
                          const pct = total > 0 ? ((d.valor / total) * 100).toFixed(0) : 0;
                          return (
                            <div key={d.nome} className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                              <div className="flex flex-col">
                                <span className="text-xs">{d.nome}</span>
                                <span className="text-xs" style={{ color: "#c4c9ad" }}>{pct}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
              }
            </div>
          </div>

          {/* lista transações */}
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <h2 className="text-xl font-semibold" style={{ fontFamily: "Hanken Grotesk" }}>Últimas Transações</h2>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg border border-white/10 transition-colors" style={{ color: "#c4c9ad" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#353534")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                ><span className="mat-icon text-sm">search</span></button>
                <button className="p-2 rounded-lg border border-white/10 flex items-center gap-1 transition-colors" style={{ color: "#c4c9ad" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#353534")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span className="mat-icon text-sm">filter_list</span>
                  <span className="text-xs font-medium hidden sm:inline">Filtrar</span>
                </button>
              </div>
            </div>

            {loading && (
              <div className="space-y-3">
                {[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#1c1b1b" }} />)}
              </div>
            )}

            {!loading && Object.keys(grupos).length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: "#c4c9ad" }}>
                <span className="mat-icon text-4xl">receipt_long</span>
                <p className="text-sm">Nenhuma transação em {mesSelecionado}.</p>
              </div>
            )}

            {!loading && Object.entries(grupos).map(([grupo, itens]) => (
              <div key={grupo} className="space-y-3">
                <div className="text-xs uppercase tracking-widest font-medium pl-2" style={{ color: "#c4c9ad", fontFamily: "Geist" }}>{grupo}</div>
                <div className="flex flex-col gap-2">
                  {itens.map((t) => {
                    const valor = Number(t.valor ?? 0);
                    const positivo = t.tipo === 1; // 1=Receita
                    const catNome = categorias.find((c) => c.id === t.categoriaId)?.nome ?? t.categoria?.nome ?? "—";
                    const hora = new Date(t.data || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <div key={t.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-white/5 transition-all cursor-pointer"
                        style={{ background: "rgba(14,14,14,.5)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; e.currentTarget.style.background = "rgba(28,27,27,.5)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,.05)"; e.currentTarget.style.background = "rgba(14,14,14,.5)"; }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconColors[corParaCategoria(catNome)]}`}>
                            <span className="mat-icon">{iconeParaCategoria(catNome)}</span>
                          </div>
                          <div>
                            <div className="font-medium text-sm">{catNome}</div>
                            <div className="text-xs mt-0.5" style={{ color: "#c4c9ad" }}>{catNome} • {hora}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm" style={{ color: positivo ? "#add500" : "#e5e2e1" }}>
                            {positivo ? "+" : "-"} {fmt(valor)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {!loading && Object.keys(grupos).length > 0 && (
              <div className="pt-6 flex justify-center pb-12">
                <button className="px-6 py-2.5 rounded-full border border-white/10 text-sm font-medium flex items-center gap-2 transition-colors" style={{ color: "#c4c9ad" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#353534"; e.currentTarget.style.color = "#e5e2e1"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#c4c9ad"; }}
                >
                  Carregar mais transações
                  <span className="mat-icon text-sm">expand_more</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL */}
      {modalAberto && (
        <ModalLancamento
          categorias={categorias}
          onClose={() => setModalAberto(false)}
          onSucesso={buscarDados}
        />
      )}
    </div>
  );
}