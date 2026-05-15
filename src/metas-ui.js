/**
 * RS Finance — Metas UI
 */
import { getMetas, addMeta, updateMeta, deleteMeta, concluirMeta, addDeposito } from './metas.js';
import { formatBRL } from './data.js';

const EMOJIS = [
  '🎯', '✈️', '🏖️', '🌍', '🏝️',
  '💻', '🖥️', '🖨️', '📱', '🎮',
  '❄️', '🏠', '🏡', '🔧', '🛋️',
  '🚗', '🏋️', '📚', '💍', '🎸',
  '🏆', '💎', '🎨', '🛒', '🎁',
];

const CORES = [
  '#4ade80', '#38bdf8', '#f472b6', '#fb923c',
  '#a78bfa', '#facc15', '#ef4444', '#2dd4bf',
  '#818cf8', '#e879f9', '#22d3ee', '#f97316',
];

let metas = [];

export async function renderMetasSection(container) {
  container.innerHTML = `
    <section class="metas-section">
      <div class="metas-header">
        <h2 class="section-title" style="margin-bottom: 0;">
          <span class="icon">🎯</span>
          Minhas Metas
        </h2>
        <button class="btn-nova-meta" id="btn-nova-meta">➕ Nova Meta</button>
      </div>
      <div id="metas-grid" class="metas-grid"></div>
    </section>
  `;

  document.getElementById('btn-nova-meta').addEventListener('click', () => {
    renderMetaModal(loadMetas);
  });

  await loadMetas();
}

async function loadMetas() {
  const grid = document.getElementById('metas-grid');
  if (!grid) return;

  try {
    metas = await getMetas();
    renderMetasGrid();
  } catch (err) {
    console.error('Erro ao carregar metas:', err);
    grid.innerHTML = `<p class="metas-erro">Erro ao carregar metas: ${err.message}</p>`;
  }
}

function renderMetasGrid() {
  const grid = document.getElementById('metas-grid');
  if (!grid) return;

  if (metas.length === 0) {
    grid.innerHTML = `
      <div class="metas-empty">
        <div class="metas-empty-icon">🎯</div>
        <p class="metas-empty-title">Nenhuma meta ainda</p>
        <p class="metas-empty-sub">Crie sua primeira meta e comece a guardar dinheiro com foco!</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = metas.map(renderMetaCardHTML).join('');

  grid.querySelectorAll('.btn-depositar').forEach(btn => {
    btn.addEventListener('click', () => {
      const meta = metas.find(m => m.id === btn.dataset.id);
      if (meta) renderDepositoModal(meta, loadMetas);
    });
  });

  grid.querySelectorAll('.btn-edit-meta').forEach(btn => {
    btn.addEventListener('click', () => {
      const meta = metas.find(m => m.id === btn.dataset.id);
      if (meta) renderMetaModal(loadMetas, meta);
    });
  });

  grid.querySelectorAll('.btn-concluir-meta').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Marcar meta como concluída? Ela sairá da lista.')) {
        try {
          await concluirMeta(btn.dataset.id);
          await loadMetas();
        } catch (err) {
          alert(`Erro: ${err.message}`);
        }
      }
    });
  });

  grid.querySelectorAll('.btn-delete-meta').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Excluir esta meta? Todos os depósitos serão apagados.')) {
        try {
          await deleteMeta(btn.dataset.id);
          await loadMetas();
        } catch (err) {
          alert(`Erro: ${err.message}`);
        }
      }
    });
  });

  // Animate progress bars after render
  requestAnimationFrame(() => {
    grid.querySelectorAll('.meta-progress-fill').forEach(bar => {
      const pct = bar.dataset.pct;
      bar.style.width = `${pct}%`;
    });
  });
}

function renderMetaCardHTML(meta) {
  const pct = meta.valor_alvo > 0
    ? Math.min((meta.valor_atual / meta.valor_alvo) * 100, 100)
    : 0;
  const atingida = meta.valor_atual >= meta.valor_alvo;
  const faltam = Math.max(meta.valor_alvo - meta.valor_atual, 0);

  let prazoHtml = '';
  if (meta.data_limite) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(meta.data_limite + 'T00:00:00');
    const diffDays = Math.round((limite - hoje) / (1000 * 60 * 60 * 24));

    let prazoClass = '';
    let prazoLabel = '';
    if (diffDays < 0) {
      prazoClass = 'vencido';
      prazoLabel = `⚠️ Prazo vencido há ${Math.abs(diffDays)} dias`;
    } else if (diffDays === 0) {
      prazoClass = 'urgente';
      prazoLabel = '⏰ Vence hoje!';
    } else if (diffDays <= 30) {
      prazoClass = 'urgente';
      prazoLabel = `⏰ ${diffDays} dias restantes`;
    } else {
      prazoLabel = `📅 ${diffDays} dias restantes`;
    }

    prazoHtml = `<div class="meta-prazo ${prazoClass}">${prazoLabel}</div>`;
  }

  const actionBtn = atingida
    ? `<button class="btn-concluir-meta meta-action-btn-main" data-id="${meta.id}">✅ Concluir Meta</button>`
    : `<button class="btn-depositar meta-action-btn-main" data-id="${meta.id}">💰 Adicionar</button>`;

  return `
    <div class="meta-card" style="--meta-cor: ${meta.cor}">
      <div class="meta-card-header">
        <div class="meta-icon-wrap">
          <span class="meta-emoji">${meta.icone}</span>
        </div>
        <div class="meta-info">
          <div class="meta-nome">${meta.nome}</div>
          ${meta.descricao ? `<div class="meta-descricao">${meta.descricao}</div>` : ''}
        </div>
        <div class="meta-card-actions">
          ${atingida ? `<button class="btn-concluir-meta meta-icon-btn" data-id="${meta.id}" title="Concluir meta">✅</button>` : ''}
          <button class="btn-edit-meta meta-icon-btn" data-id="${meta.id}" title="Editar">✏️</button>
          <button class="btn-delete-meta meta-icon-btn" data-id="${meta.id}" title="Excluir">🗑️</button>
        </div>
      </div>

      <div class="meta-progress-track">
        <div class="meta-progress-fill" data-pct="${pct.toFixed(1)}" style="width: 0%; background: ${meta.cor}"></div>
      </div>

      <div class="meta-valores-row">
        <div class="meta-valor-atual" style="color: ${meta.cor}">${formatBRL(meta.valor_atual)}</div>
        <div class="meta-pct">${pct.toFixed(1)}%</div>
        <div class="meta-valor-alvo">de ${formatBRL(meta.valor_alvo)}</div>
      </div>

      <div class="meta-faltam ${atingida ? 'atingida' : ''}">
        ${atingida ? '🎉 Meta atingida! Parabéns!' : `Faltam ${formatBRL(faltam)}`}
      </div>

      ${prazoHtml}

      ${actionBtn}
    </div>
  `;
}

export function renderMetaModal(onSuccess, meta = null) {
  const isEdit = meta !== null;

  const existing = document.getElementById('modal-meta');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-meta';
  modal.className = 'modal-overlay';

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? '✏️ Editar Meta' : '🎯 Nova Meta'}</h3>
        <button class="modal-close" id="meta-close">&times;</button>
      </div>

      <form id="form-meta" class="modal-form">
        <div class="form-row">
          <div class="form-group">
            <label>Nome da Meta *</label>
            <input type="text" id="meta-nome" placeholder="Ex: Viagem para Europa" required />
          </div>
          <div class="form-group form-group-sm">
            <label>Valor Alvo (R$) *</label>
            <input type="number" id="meta-valor-alvo" placeholder="0,00" step="0.01" min="1" required />
          </div>
        </div>

        <div class="form-group">
          <label>Ícone</label>
          <div class="emoji-picker" id="emoji-picker">
            ${EMOJIS.map(e => `<button type="button" class="emoji-btn" data-emoji="${e}">${e}</button>`).join('')}
          </div>
          <input type="hidden" id="meta-icone" value="🎯" />
        </div>

        <div class="form-group">
          <label>Cor</label>
          <div class="color-picker" id="color-picker">
            ${CORES.map(c => `<button type="button" class="color-btn" data-cor="${c}" style="background: ${c}"></button>`).join('')}
          </div>
          <input type="hidden" id="meta-cor" value="${CORES[0]}" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Prazo (opcional)</label>
            <input type="date" id="meta-data-limite" />
          </div>
          <div class="form-group">
            <label>Descrição (opcional)</label>
            <input type="text" id="meta-descricao" placeholder="Detalhes da meta..." />
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="meta-cancel">Cancelar</button>
          <button type="submit" class="btn-primary" id="meta-submit">
            <span id="meta-submit-text">${isEdit ? '💾 Salvar alterações' : '🎯 Criar Meta'}</span>
            <span id="meta-submit-spinner" class="spinner" style="display: none;"></span>
          </button>
        </div>
      </form>
      <div id="meta-msg" class="form-message"></div>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('active'));

  // Pre-fill when editing, otherwise highlight defaults
  const defaultEmoji = isEdit ? meta.icone : '🎯';
  const defaultCor = isEdit ? meta.cor : CORES[0];

  if (isEdit) {
    document.getElementById('meta-nome').value = meta.nome || '';
    document.getElementById('meta-valor-alvo').value = meta.valor_alvo || '';
    document.getElementById('meta-data-limite').value = meta.data_limite || '';
    document.getElementById('meta-descricao').value = meta.descricao || '';
    document.getElementById('meta-icone').value = meta.icone;
    document.getElementById('meta-cor').value = meta.cor;
  }

  const emojiBtn = modal.querySelector(`.emoji-btn[data-emoji="${defaultEmoji}"]`);
  if (emojiBtn) emojiBtn.classList.add('selected');
  const corBtn = modal.querySelector(`.color-btn[data-cor="${defaultCor}"]`);
  if (corBtn) corBtn.classList.add('selected');

  modal.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('meta-icone').value = btn.dataset.emoji;
    });
  });

  modal.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('meta-cor').value = btn.dataset.cor;
    });
  });

  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  };

  document.getElementById('meta-close').addEventListener('click', closeModal);
  document.getElementById('meta-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  document.getElementById('form-meta').addEventListener('submit', async e => {
    e.preventDefault();

    const nome = document.getElementById('meta-nome').value.trim();
    const valor_alvo = parseFloat(document.getElementById('meta-valor-alvo').value);
    const icone = document.getElementById('meta-icone').value;
    const cor = document.getElementById('meta-cor').value;
    const data_limite = document.getElementById('meta-data-limite').value || null;
    const descricao = document.getElementById('meta-descricao').value.trim() || null;

    const btn = document.getElementById('meta-submit');
    const text = document.getElementById('meta-submit-text');
    const spinner = document.getElementById('meta-submit-spinner');
    btn.disabled = true;
    text.style.display = 'none';
    spinner.style.display = 'inline-block';

    try {
      if (isEdit) {
        await updateMeta(meta.id, { nome, valor_alvo, icone, cor, data_limite, descricao });
      } else {
        await addMeta({ nome, valor_alvo, icone, cor, data_limite, descricao });
      }
      closeModal();
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = document.getElementById('meta-msg');
      msg.textContent = `Erro: ${err.message}`;
      msg.className = 'form-message error';
      btn.disabled = false;
      text.style.display = 'inline';
      spinner.style.display = 'none';
    }
  });
}

function renderDepositoModal(meta, onSuccess) {
  const existing = document.getElementById('modal-deposito');
  if (existing) existing.remove();

  const pct = Math.min((meta.valor_atual / meta.valor_alvo) * 100, 100);

  const modal = document.createElement('div');
  modal.id = 'modal-deposito';
  modal.className = 'modal-overlay';

  modal.innerHTML = `
    <div class="modal-card modal-card-sm">
      <div class="modal-header">
        <h3 class="modal-title">${meta.icone} ${meta.nome}</h3>
        <button class="modal-close" id="dep-close">&times;</button>
      </div>

      <div class="dep-meta-preview">
        <div class="meta-progress-track" style="margin-bottom: 8px;">
          <div class="meta-progress-fill" style="width: ${pct}%; background: ${meta.cor}; transition: none;"></div>
        </div>
        <div class="dep-meta-valores">
          <span style="color: ${meta.cor}; font-weight: 700;">${formatBRL(meta.valor_atual)}</span>
          <span style="color: var(--text-muted);">de ${formatBRL(meta.valor_alvo)}</span>
          <span style="color: var(--text-muted);">(${pct.toFixed(1)}%)</span>
        </div>
      </div>

      <form id="form-deposito" class="modal-form">
        <div class="form-group">
          <label>Valor do Depósito (R$) *</label>
          <input type="number" id="dep-valor" placeholder="0,00" step="0.01" min="0.01" required autofocus />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Data *</label>
            <input type="date" id="dep-data" value="${new Date().toISOString().split('T')[0]}" required />
          </div>
          <div class="form-group">
            <label>Observação (opcional)</label>
            <input type="text" id="dep-obs" placeholder="Ex: Salário de maio" />
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="dep-cancel">Cancelar</button>
          <button type="submit" class="btn-primary" id="dep-submit">
            <span id="dep-submit-text">💰 Depositar</span>
            <span id="dep-submit-spinner" class="spinner" style="display: none;"></span>
          </button>
        </div>
      </form>
      <div id="dep-msg" class="form-message"></div>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('active'));

  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  };

  document.getElementById('dep-close').addEventListener('click', closeModal);
  document.getElementById('dep-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  document.getElementById('form-deposito').addEventListener('submit', async e => {
    e.preventDefault();

    const valor = parseFloat(document.getElementById('dep-valor').value);
    const data = document.getElementById('dep-data').value;
    const observacao = document.getElementById('dep-obs').value.trim() || null;

    const btn = document.getElementById('dep-submit');
    const text = document.getElementById('dep-submit-text');
    const spinner = document.getElementById('dep-submit-spinner');
    btn.disabled = true;
    text.style.display = 'none';
    spinner.style.display = 'inline-block';

    try {
      await addDeposito(meta.id, { valor, data, observacao }, meta.valor_atual);
      closeModal();
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = document.getElementById('dep-msg');
      msg.textContent = `Erro: ${err.message}`;
      msg.className = 'form-message error';
      btn.disabled = false;
      text.style.display = 'inline';
      spinner.style.display = 'none';
    }
  });
}
