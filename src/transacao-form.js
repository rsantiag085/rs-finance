/**
 * RS Finance — Transaction Form Modal
 */
import { supabase } from './lib/supabase.js';
import { addTransacao, getCategorias, getMetodos } from './data.js';

let categorias = [];
let metodos = [];

export async function initFormData() {
  categorias = await getCategorias();
  metodos = await getMetodos();
}

export function renderTransacaoModal(onSuccess) {
  // Remove existing modal
  const existing = document.getElementById('modal-transacao');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-transacao';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3 class="modal-title">➕ Nova Transação</h3>
        <button class="modal-close" id="modal-close" aria-label="Fechar">&times;</button>
      </div>
      <form id="form-transacao" class="modal-form">
        <div class="form-row">
          <div class="form-group">
            <label for="tx-descricao">Descrição *</label>
            <input type="text" id="tx-descricao" placeholder="Ex: Conta de luz" required />
          </div>
          <div class="form-group form-group-sm">
            <label for="tx-valor">Valor (R$) *</label>
            <input type="number" id="tx-valor" placeholder="0,00" step="0.01" min="0.01" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="tx-tipo">Tipo *</label>
            <select id="tx-tipo" required>
              <option value="saida">↓ Saída (Gasto)</option>
              <option value="entrada">↑ Entrada (Receita)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="tx-data">Data *</label>
            <input type="date" id="tx-data" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="tx-categoria">Categoria</label>
            <select id="tx-categoria">
              <option value="">Selecione...</option>
              ${categorias.map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="tx-metodo">Forma de Pagamento</label>
            <select id="tx-metodo">
              <option value="">Selecione...</option>
              ${metodos.map(m => `<option value="${m.id}">${m.nome}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="tx-obs">Observação</label>
          <input type="text" id="tx-obs" placeholder="Opcional" />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
          <button type="submit" class="btn-primary" id="btn-save">
            <span id="btn-save-text">💾 Salvar</span>
            <span id="btn-save-loading" class="spinner" style="display: none;"></span>
          </button>
        </div>
      </form>
      <div id="form-message" class="form-message"></div>
    </div>
  `;

  document.body.appendChild(modal);

  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('tx-data').value = today;

  // Animate in
  requestAnimationFrame(() => modal.classList.add('active'));

  // Close handlers
  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  };

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Submit
  document.getElementById('form-transacao').addEventListener('submit', async (e) => {
    e.preventDefault();

    const descricao = document.getElementById('tx-descricao').value.trim();
    const valor = parseFloat(document.getElementById('tx-valor').value);
    const tipo = document.getElementById('tx-tipo').value;
    const data = document.getElementById('tx-data').value;
    const categoria_id = document.getElementById('tx-categoria').value || null;
    const metodo_id = document.getElementById('tx-metodo').value || null;
    const observacao = document.getElementById('tx-obs').value.trim() || null;

    if (!descricao || !valor || !tipo || !data) {
      showFormMessage('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    setFormLoading(true);

    try {
      await addTransacao({ descricao, valor, tipo, data, categoria_id, metodo_id, observacao });
      closeModal();
      if (onSuccess) onSuccess();
    } catch (err) {
      showFormMessage(`Erro: ${err.message}`, 'error');
    } finally {
      setFormLoading(false);
    }
  });
}

function setFormLoading(loading) {
  const btn = document.getElementById('btn-save');
  const text = document.getElementById('btn-save-text');
  const spinner = document.getElementById('btn-save-loading');
  if (btn) btn.disabled = loading;
  if (text) text.style.display = loading ? 'none' : 'inline';
  if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
}

function showFormMessage(msg, type) {
  const el = document.getElementById('form-message');
  if (el) {
    el.textContent = msg;
    el.className = `form-message ${type}`;
  }
}
