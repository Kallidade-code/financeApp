// Configuração da URL base da sua API ASP.NET Core
const API_URL = 'http://localhost:5197/Finance'; // Certifique-se de que a porta está correta

// --- FUNÇÕES UTILITÁRIAS ---

const formatarMoeda = (valor) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatarData = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
};

// --- FUNÇÕES DE CONSUMO DA API ---

// 1. Carregar Saldo Atual e atualizar múltiplos elementos
async function carregarSaldo() {
    try {
        const response = await fetch(`${API_URL}/saldo`);
        if (!response.ok) throw new Error('Erro ao buscar saldo');
        
        const saldo = await response.json();
        
        // Atualiza o Saldo Grande (Cabeçalho)
        const elementoSaldoGrande = document.getElementById('saldo-atual');
        elementoSaldoGrande.textContent = formatarMoeda(saldo);
        
        // Atualiza o Saldo no Card Central
        const elementoSaldoCard = document.getElementById('total-saldo-card');
        elementoSaldoCard.textContent = formatarMoeda(saldo);
        
        // Mudar cor do saldo grande se for negativo
        if (saldo < 0) {
            elementoSaldoGrande.classList.remove('text-white');
            elementoSaldoGrande.classList.add('text-rose-400');
        } else {
            elementoSaldoGrande.classList.remove('text-rose-400');
            elementoSaldoGrande.classList.add('text-white');
        }
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('saldo-atual').textContent = 'Erro';
    }
}

// 2. Carregar Transações e calcular resumos de Entradas/Saídas
async function carregarTransacoes() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Erro ao buscar transações');
        
        const transacoes = await response.json();
        
        // Ordenar por data decrescente (mais recentes primeiro)
        transacoes.sort((a, b) => new Date(b.data) - new Date(a.data));

        renderizarTabela(transacoes);
        calcularEntradasSaidas(transacoes);

    } catch (error) {
        console.error('Erro:', error);
    }
}

// 3. Adicionar Nova Transação via POST
async function adicionarTransacao(event) {
    event.preventDefault(); // Impede o recarregamento da página

    const tipo = document.getElementById('transacao-tipo').value;
    const categoria = document.getElementById('transacao-categoria').value;
    const valor = parseFloat(document.getElementById('transacao-valor').value);
    const data = document.getElementById('transacao-data').value;

    // Estrutura EXATA do seu Model Transacao.cs no C#
    const novaTransacao = {
        tipo: tipo,
        categoria: categoria,
        valor: valor,
        data: data
        // O Id é gerado pelo seu Service, então não enviamos
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(novaTransacao)
        });

        if (response.ok) {
            // Sucesso: Fecha modal, limpa form e recarrega dados
            toggleModal();
            document.getElementById('form-transacao').reset();
            inicializar();
        } else {
            alert('Erro ao salvar a transação no servidor.');
        }
    } catch (error) {
        console.error('Erro na requisição POST:', error);
        alert('Não foi possível conectar ao servidor.');
    }
}

// --- FUNÇÕES DE RENDERIZAÇÃO E UI ---

function renderizarTabela(transacoes) {
    const corpoTabela = document.getElementById('tabela-corpo');
    corpoTabela.innerHTML = ''; // Limpa a tabela

    // Limita a exibição às 10 mais recentes para performance (réplica da referência)
    const ultimasTransacoes = transacoes.slice(0, 10);

    ultimasTransacoes.forEach(t => {
        const ehReceita = t.tipo === "Receita";
        const classeValor = ehReceita ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
        const sinal = ehReceita ? '+' : '-';
        
        const row = `
            <tr class="hover:bg-gray-800 transition">
                <td class="px-6 py-5 text-slate-400">${formatarData(t.data)}</td>
                <td class="px-6 py-5 font-semibold text-white">${t.categoria}</td>
                <td class="px-6 py-5">
                    <span class="px-4 py-1.5 rounded-lg text-xs font-bold ${ehReceita ? 'bg-emerald-950/70 text-emerald-400' : 'bg-rose-950/70 text-rose-400'}">
                        ${t.tipo}
                    </span>
                </td>
                <td class="px-6 py-5 text-right ${classeValor} text-base tracking-tight">
                    ${sinal} ${formatarMoeda(t.valor)}
                </td>
            </tr>
        `;
        corpoTabela.insertAdjacentHTML('beforeend', row);
    });
}

// Função para calcular totais de Receita e Despesa na tela
function calcularEntradasSaidas(transacoes) {
    const totalReceitas = transacoes
        .filter(t => t.tipo === "Receita")
        .reduce((sum, t) => sum + t.valor, 0);

    const totalDespesas = transacoes
        .filter(t => t.tipo === "Despesa")
        .reduce((sum, t) => sum + t.valor, 0);

    document.getElementById('total-receitas').textContent = formatarMoeda(totalReceitas);
    document.getElementById('total-despesas').textContent = formatarMoeda(totalDespesas);
}


// --- LÓGICA DO MODAL (Estilo Réplica) ---

function toggleModal(tipo = '') {
    const body = document.querySelector('body');
    const modal = document.getElementById('modal-nova-transacao');
    const titulo = document.getElementById('modal-titulo');
    const btnSalvar = document.getElementById('btn-salvar');
    const inputTipo = document.getElementById('transacao-tipo');
    
    // Define a data de hoje como padrão
    if (!document.getElementById('transacao-data').value) {
        document.getElementById('transacao-data').valueAsDate = new Date();
    }

    if (tipo) {
        // Configura modal para o tipo específico
        inputTipo.value = tipo;
        titulo.textContent = `Adicionar ${tipo}`;
        
        if (tipo === 'Receita') {
            btnSalvar.className = "px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-extrabold transition shadow-lg hover:-translate-y-0.5";
            btnSalvar.textContent = "Salvar Receita";
        } else {
            btnSalvar.className = "px-8 py-3.5 bg-rose-500 hover:bg-rose-600 rounded-xl text-white font-extrabold transition shadow-lg hover:-translate-y-0.5";
            btnSalvar.textContent = "Salvar Despesa";
        }
    }

    modal.classList.toggle('opacity-0');
    modal.classList.toggle('pointer-events-none');
    body.classList.toggle('modal-active');
}


// --- INICIALIZAÇÃO ---

// Event Listener para o formulário
document.getElementById('form-transacao').addEventListener('submit', adicionarTransacao);

function inicializar() {
    carregarSaldo();
    carregarTransacoes();
}

// Executa ao carregar a página
window.onload = inicializar;