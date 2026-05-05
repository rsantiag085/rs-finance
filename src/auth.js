/**
 * RS Finance — Autenticação (Login / Registro)
 */
import { supabase } from './lib/supabase.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <img src="/logo-small.png" alt="RS Finance" class="auth-logo-img" />
        <h1 class="auth-title">RS Finance</h1>
        <p class="auth-subtitle">Controle seu orçamento pessoal</p>

        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login" id="tab-login">Entrar</button>
          <button class="auth-tab" data-tab="register" id="tab-register">Criar Conta</button>
        </div>

        <form id="auth-form" class="auth-form">
          <div class="form-group" id="name-group" style="display: none;">
            <label for="auth-name">Nome</label>
            <input type="text" id="auth-name" placeholder="Seu nome" autocomplete="name" />
          </div>
          <div class="form-group">
            <label for="auth-email">Email</label>
            <input type="email" id="auth-email" placeholder="seu@email.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="auth-password">Senha</label>
            <input type="password" id="auth-password" placeholder="Mínimo 6 caracteres" required minlength="6" autocomplete="current-password" />
          </div>
          <button type="submit" class="auth-btn" id="auth-submit">
            <span id="auth-btn-text">Entrar</span>
            <span id="auth-btn-loading" class="spinner" style="display: none;"></span>
          </button>
        </form>

        <div id="auth-message" class="auth-message"></div>
      </div>
    </div>
  `;

  let mode = 'login';

  // Tab switching
  container.querySelector('#tab-login').addEventListener('click', () => {
    mode = 'login';
    container.querySelector('#tab-login').classList.add('active');
    container.querySelector('#tab-register').classList.remove('active');
    container.querySelector('#name-group').style.display = 'none';
    container.querySelector('#auth-btn-text').textContent = 'Entrar';
    container.querySelector('#auth-password').autocomplete = 'current-password';
    clearMessage();
  });

  container.querySelector('#tab-register').addEventListener('click', () => {
    mode = 'register';
    container.querySelector('#tab-register').classList.add('active');
    container.querySelector('#tab-login').classList.remove('active');
    container.querySelector('#name-group').style.display = 'block';
    container.querySelector('#auth-btn-text').textContent = 'Criar Conta';
    container.querySelector('#auth-password').autocomplete = 'new-password';
    clearMessage();
  });

  // Form submit
  container.querySelector('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#auth-email').value.trim();
    const password = container.querySelector('#auth-password').value;
    const name = container.querySelector('#auth-name').value.trim();

    setLoading(true);
    clearMessage();

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name || email.split('@')[0] },
          },
        });
        if (error) throw error;
        showMessage('✅ Conta criada! Verifique seu email para confirmar ou faça login.', 'success');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Auth state change will handle redirect
      }
    } catch (err) {
      showMessage(`❌ ${translateError(err.message)}`, 'error');
    } finally {
      setLoading(false);
    }
  });

  function setLoading(loading) {
    const btn = container.querySelector('#auth-submit');
    const text = container.querySelector('#auth-btn-text');
    const spinner = container.querySelector('#auth-btn-loading');
    btn.disabled = loading;
    text.style.display = loading ? 'none' : 'inline';
    spinner.style.display = loading ? 'inline-block' : 'none';
  }

  function showMessage(msg, type) {
    const el = container.querySelector('#auth-message');
    el.textContent = msg;
    el.className = `auth-message ${type}`;
  }

  function clearMessage() {
    const el = container.querySelector('#auth-message');
    el.textContent = '';
    el.className = 'auth-message';
  }
}

function translateError(msg) {
  const translations = {
    'Invalid login credentials': 'Email ou senha incorretos',
    'User already registered': 'Esse email já está cadastrado',
    'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres',
    'Unable to validate email address: invalid format': 'Formato de email inválido',
    'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
  };
  return translations[msg] || msg;
}
