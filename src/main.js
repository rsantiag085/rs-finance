/**
 * RS Finance — Main Application (Supabase-powered)
 */
import './style.css';
import { supabase } from './lib/supabase.js';
import { renderLogin } from './auth.js';
import {
  getTransacoes,
  calcularResumo,
  agruparPorCategoria,
  agruparPorMetodo,
  dadosFluxo,
  formatBRL,
  deleteTransacao,
} from './data.js';
import { criarGraficoDoughnut, criarCentroTexto, destroyCharts } from './charts.js';
import { renderTransacaoModal, initFormData } from './transacao-form.js';

// ============================================================
// State
// ============================================================
let currentUser = null;
let currentMonth = new Date().getMonth() + 1; // 1-12
let currentYear = new Date().getFullYear();
let transacoes = [];

const MESES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// ============================================================
// Init
// ============================================================
let dashboardRendered = false;

document.addEventListener('DOMContentLoaded', async () => {
  // Check existing session first (avoids lock issues)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    dashboardRendered = true;
    renderDashboard();
  } else {
    renderLogin(document.getElementById('app'));
  }

  // Listen for future auth changes (login/logout)
  supabase.auth.onAuthStateChange(async (event, newSession) => {
    if (event === 'SIGNED_IN' && newSession?.user && !dashboardRendered) {
      currentUser = newSession.user;
      dashboardRendered = true;
      renderDashboard();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      dashboardRendered = false;
      renderLogin(document.getElementById('app'));
    }
  });
});

// ============================================================
// Dashboard
// ============================================================
async function renderDashboard() {
  const app = document.getElementById('app');
  const userName = currentUser.user_metadata?.name || currentUser.email.split('@')[0];

  app.innerHTML = `
    <!-- HEADER -->
    <header class="header" id="header">
      <div class="header-brand">
        <div class="header-logo">R$</div>
        <div>
          <div class="header-title">RS Finance</div>
          <div class="header-subtitle">Olá, ${userName} 👋</div>
        </div>
      </div>
      <div class="header-actions">
        <div class="month-selector">
          <button class="month-btn" id="prev-month" aria-label="Mês anterior">‹</button>
          <span class="month-label" id="month-label">${MESES[currentMonth]} / ${currentYear}</span>
          <button class="month-btn" id="next-month" aria-label="Próximo mês">›</button>
        </div>
        <button class="btn-add" id="btn-add-transacao">➕ Nova Transação</button>
        <button class="btn-logout" id="btn-logout" title="Sair">🚪</button>
      </div>
    </header>

    <!-- MAIN -->
    <main class="main">
      <!-- Loading -->
      <div id="loading" class="loading-container">
        <div class="spinner large"></div>
        <p>Carregando dados...</p>
      </div>

      <!-- Content (hidden until loaded) -->
      <div id="dashboard-content" style="display: none;">
        <!-- KPI Cards -->
        <section class="kpi-section">
          <div class="kpi-grid">
            <div class="kpi-card receita" id="card-receita">
              <div class="kpi-icon">📈</div>
              <div class="kpi-label">Receita Total</div>
              <div class="kpi-value" id="kpi-receita">R$ 0,00</div>
              <div class="kpi-detail" id="kpi-receita-detail">—</div>
            </div>
            <div class="kpi-card despesa" id="card-despesa">
              <div class="kpi-icon">📉</div>
              <div class="kpi-label">Despesa Total</div>
              <div class="kpi-value" id="kpi-despesa">R$ 0,00</div>
              <div class="kpi-detail" id="kpi-despesa-detail">—</div>
            </div>
            <div class="kpi-card saldo" id="card-saldo">
              <div class="kpi-icon">⚖️</div>
              <div class="kpi-label">Saldo do Mês</div>
              <div class="kpi-value" id="kpi-saldo">R$ 0,00</div>
              <div class="kpi-detail" id="kpi-saldo-detail">—</div>
            </div>
            <div class="kpi-card comprometido" id="card-comprometido">
              <div class="kpi-icon">📊</div>
              <div class="kpi-label">% Comprometido</div>
              <div class="kpi-value" id="kpi-comprometido">0%</div>
              <div class="progress-bar-container">
                <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Charts -->
        <section class="charts-section">
          <h2 class="section-title">
            <span class="icon">📊</span>
            Análise Visual — Para onde vai seu dinheiro
          </h2>
          <div class="charts-grid">
            <div class="chart-card">
              <div class="chart-card-title"><span>💰</span> Entrada vs Saída</div>
              <div class="chart-card-subtitle">Fluxo de caixa do mês em R$ e %</div>
              <div class="chart-wrapper"><canvas id="chart-fluxo"></canvas></div>
            </div>
            <div class="chart-card">
              <div class="chart-card-title"><span>💳</span> Tipo de Pagamento</div>
              <div class="chart-card-subtitle">Como você está pagando em R$ e %</div>
              <div class="chart-wrapper"><canvas id="chart-metodo"></canvas></div>
            </div>
            <div class="chart-card">
              <div class="chart-card-title"><span>📂</span> Distribuição por Categoria</div>
              <div class="chart-card-subtitle">Gastos agrupados por categoria em R$ e %</div>
              <div class="chart-wrapper"><canvas id="chart-categoria"></canvas></div>
            </div>
          </div>
        </section>

        <!-- Empty state for charts -->
        <div id="empty-charts" class="empty-state" style="display: none;">
          <div class="empty-icon">📊</div>
          <h3>Sem dados para exibir gráficos</h3>
          <p>Adicione transações para ver a análise visual.</p>
        </div>

        <!-- Transactions Table -->
        <section class="table-section">
          <h2 class="section-title">
            <span class="icon">📋</span>
            Transações de <span id="table-month-label">${MESES[currentMonth]} / ${currentYear}</span>
          </h2>
          <div class="table-card">
            <div class="table-header">
              <div class="table-header-left">
                <span class="table-count" id="table-count">0 transações</span>
              </div>
              <div class="table-filters">
                <button class="filter-btn active" data-filter="todos" id="filter-todos">Todos</button>
                <button class="filter-btn" data-filter="entrada" id="filter-entrada">↑ Entradas</button>
                <button class="filter-btn" data-filter="saida" id="filter-saida">↓ Saídas</button>
              </div>
            </div>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Tipo</th>
                    <th>Categoria</th>
                    <th>Pagamento</th>
                    <th>Data</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="transactions-body"></tbody>
              </table>
            </div>
            <!-- Empty state for table -->
            <div id="empty-table" class="empty-state-inline" style="display: none;">
              <p>🚀 Nenhuma transação neste mês. Clique em <strong>➕ Nova Transação</strong> para começar!</p>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- FOOTER -->
    <footer class="footer">
      RS Finance © 2026 — Controle seu dinheiro, mude sua vida 💚
    </footer>
  `;

  // Event listeners (attached immediately, not blocked by data loading)
  setupEventListeners();

  // Load data (non-blocking — don't await)
  loadData();
}

// ============================================================
// Event Listeners
// ============================================================
function setupEventListeners() {
  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
  });

  // Add transaction
  document.getElementById('btn-add-transacao').addEventListener('click', async () => {
    await initFormData();
    renderTransacaoModal(() => loadData());
  });

  // Month navigation
  document.getElementById('prev-month').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    updateMonthLabel();
    loadData();
  });

  document.getElementById('next-month').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    updateMonthLabel();
    loadData();
  });

  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTable(btn.dataset.filter);
    });
  });
}

function updateMonthLabel() {
  const label = `${MESES[currentMonth]} / ${currentYear}`;
  const monthLabel = document.getElementById('month-label');
  const tableLabel = document.getElementById('table-month-label');
  if (monthLabel) monthLabel.textContent = label;
  if (tableLabel) tableLabel.textContent = label;
}

// ============================================================
// Load Data
// ============================================================
async function loadData() {
  const loading = document.getElementById('loading');
  const content = document.getElementById('dashboard-content');

  if (loading) loading.style.display = 'flex';
  if (content) content.style.display = 'none';

  try {
    transacoes = await getTransacoes(currentMonth, currentYear);
    renderKPIs();
    renderCharts();
    renderTable('todos');
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
    transacoes = [];
    renderKPIs();
    renderCharts();
    renderTable('todos');
  } finally {
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
  }
}

// ============================================================
// KPIs
// ============================================================
function renderKPIs() {
  const resumo = calcularResumo(transacoes);

  document.getElementById('kpi-receita').textContent = formatBRL(resumo.totalEntradas);
  document.getElementById('kpi-despesa').textContent = formatBRL(resumo.totalSaidas);

  const saldoEl = document.getElementById('kpi-saldo');
  saldoEl.textContent = formatBRL(resumo.saldo);
  saldoEl.className = `kpi-value ${resumo.saldo >= 0 ? 'positivo' : 'negativo'}`;

  document.getElementById('kpi-comprometido').textContent = `${resumo.pctComprometido.toFixed(1)}%`;

  const nEntradas = transacoes.filter(t => t.tipo === 'entrada').length;
  const nSaidas = transacoes.filter(t => t.tipo === 'saida').length;
  document.getElementById('kpi-receita-detail').textContent = `${nEntradas} entrada(s)`;
  document.getElementById('kpi-despesa-detail').textContent = `${nSaidas} saída(s)`;
  document.getElementById('kpi-saldo-detail').textContent = resumo.saldo >= 0 ? 'Mês positivo ✓' : 'Mês negativo ✗';

  const progressBar = document.getElementById('progress-bar');
  setTimeout(() => {
    const pct = Math.min(resumo.pctComprometido, 100);
    progressBar.style.width = `${pct}%`;
    progressBar.className = `progress-bar${resumo.pctComprometido > 100 ? ' danger' : ''}`;
  }, 300);
}

// ============================================================
// Charts
// ============================================================
function renderCharts() {
  destroyCharts();

  // Remove old center overlays
  document.querySelectorAll('.chart-center-overlay').forEach(el => el.remove());

  const chartsSection = document.querySelector('.charts-section');
  const emptyCharts = document.getElementById('empty-charts');

  if (transacoes.length === 0) {
    if (chartsSection) chartsSection.style.display = 'none';
    if (emptyCharts) emptyCharts.style.display = 'flex';
    return;
  }

  if (chartsSection) chartsSection.style.display = 'block';
  if (emptyCharts) emptyCharts.style.display = 'none';

  const resumo = calcularResumo(transacoes);

  // 1. Fluxo
  const fluxo = dadosFluxo(resumo);
  if (fluxo.some(d => d.valor > 0)) {
    criarGraficoDoughnut('chart-fluxo', fluxo, 'Entrada vs Saída');
    criarCentroTexto('chart-fluxo', formatBRL(Math.abs(resumo.saldo)), resumo.saldo >= 0 ? 'sobra' : 'déficit');
  }

  // 2. Método
  const metodos = agruparPorMetodo(transacoes);
  if (metodos.length > 0) {
    criarGraficoDoughnut('chart-metodo', metodos, 'Tipo de Pagamento');
    criarCentroTexto('chart-metodo', formatBRL(resumo.totalSaidas), 'total saídas');
  }

  // 3. Categoria
  const categorias = agruparPorCategoria(transacoes);
  if (categorias.length > 0) {
    criarGraficoDoughnut('chart-categoria', categorias, 'Por Categoria');
    criarCentroTexto('chart-categoria', `${categorias.length}`, 'categorias');
  }
}

// ============================================================
// Table
// ============================================================
function renderTable(filter = 'todos') {
  const tbody = document.getElementById('transactions-body');
  const emptyTable = document.getElementById('empty-table');
  if (!tbody) return;

  let dados = [...transacoes];

  if (filter === 'entrada') dados = dados.filter(t => t.tipo === 'entrada');
  else if (filter === 'saida') dados = dados.filter(t => t.tipo === 'saida');

  // Sort by date desc, then valor desc
  dados.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === 'entrada' ? -1 : 1;
    return b.valor - a.valor;
  });

  if (dados.length === 0) {
    tbody.innerHTML = '';
    if (emptyTable) emptyTable.style.display = 'flex';
    document.getElementById('table-count').textContent = '0 transações';
    return;
  }

  if (emptyTable) emptyTable.style.display = 'none';

  tbody.innerHTML = dados.map((t, i) => {
    const cat = t.categorias;
    const met = t.metodos_pagamento;
    const corCat = cat ? cat.cor : '#94a3b8';
    const dataFormatted = new Date(t.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    return `
      <tr style="animation: fadeInUp 0.3s ease-out ${i * 0.02}s backwards">
        <td class="td-nome">${t.descricao}</td>
        <td class="td-valor ${t.tipo}">
          ${t.tipo === 'entrada' ? '+' : '-'} ${formatBRL(t.valor)}
        </td>
        <td>
          <span class="td-badge ${t.tipo}">
            ${t.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
          </span>
        </td>
        <td>
          <span class="td-categoria">
            <span class="dot" style="background: ${corCat}"></span>
            ${cat ? cat.nome : '—'}
          </span>
        </td>
        <td class="td-metodo">${met ? met.nome : '—'}</td>
        <td class="td-data">${dataFormatted}</td>
        <td>
          <button class="btn-delete" data-id="${t.id}" title="Excluir">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('table-count').textContent = `${dados.length} transações`;

  // Delete buttons
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('Tem certeza que deseja excluir essa transação?')) {
        try {
          await deleteTransacao(id);
          await loadData();
        } catch (err) {
          alert(`Erro ao excluir: ${err.message}`);
        }
      }
    });
  });
}
