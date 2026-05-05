# 💰 RS Finance

App de gerenciamento de orçamento pessoal. Controle seus gastos, saiba para onde vai seu dinheiro e visualize tudo com gráficos interativos.

![RS Finance Dashboard](https://img.shields.io/badge/status-production-brightgreen) ![Supabase](https://img.shields.io/badge/backend-Supabase-3ECF8E) ![Vite](https://img.shields.io/badge/frontend-Vite-646CFF) ![Chart.js](https://img.shields.io/badge/charts-Chart.js-FF6384)

## ✨ Funcionalidades

- 🔐 **Autenticação** — Login e registro com email/senha (Supabase Auth)
- 📊 **Dashboard visual** — KPIs de receita, despesa, saldo e % comprometido
- 🍩 **3 Gráficos interativos** — Entrada vs Saída, Tipo de Pagamento, e Distribuição por Categoria (valores em R$ e %)
- ➕ **CRUD de transações** — Adicione, visualize e exclua gastos e receitas
- 📅 **Navegação por mês** — Veja seus dados mês a mês
- 🏷️ **Categorias automáticas** — 16 categorias pré-configuradas ao criar conta
- 💳 **Métodos de pagamento** — PIX, Boleto, Crédito, Débito, TED, Dinheiro
- 🔒 **Multi-usuário** — Cada usuário vê apenas seus dados (RLS)
- 📱 **Responsivo** — Funciona em desktop, tablet e celular
- 🌙 **Dark mode premium** — Design escuro com glassmorphism

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| [Vite](https://vitejs.dev) | Build tool + dev server |
| [Supabase](https://supabase.com) | Auth + PostgreSQL + RLS |
| [Chart.js](https://www.chartjs.org) | Gráficos doughnut interativos |
| Vanilla JS | Frontend sem framework |
| CSS3 | Design system custom |

## 🚀 Setup Local

### 1. Clone o repositório

```bash
git clone https://github.com/SEU_USUARIO/rs-finance.git
cd rs-finance
npm install
```

### 2. Configure o Supabase

Crie um projeto gratuito em [supabase.com](https://supabase.com) e execute as migrações SQL abaixo no **SQL Editor**:

<details>
<summary>📦 SQL — Criar tabelas</summary>

```sql
CREATE TABLE categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#94a3b8',
  icone TEXT DEFAULT '📂',
  tipo TEXT CHECK (tipo IN ('entrada', 'saida', 'ambos')) DEFAULT 'saida',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, nome)
);

CREATE TABLE metodos_pagamento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#94a3b8',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, nome)
);

CREATE TABLE transacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  tipo TEXT CHECK (tipo IN ('entrada', 'saida')) NOT NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  metodo_id UUID REFERENCES metodos_pagamento(id) ON DELETE SET NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transacoes_user_data ON transacoes(user_id, data DESC);
CREATE INDEX idx_transacoes_user_tipo ON transacoes(user_id, tipo);
```

</details>

<details>
<summary>🔒 SQL — Habilitar RLS (Row Level Security)</summary>

```sql
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE metodos_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own categorias" ON categorias FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own metodos" ON metodos_pagamento FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own transacoes" ON transacoes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

</details>

<details>
<summary>🌱 SQL — Auto-seed categorias ao criar conta</summary>

```sql
CREATE OR REPLACE FUNCTION public.seed_user_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO categorias (user_id, nome, cor, icone, tipo) VALUES
    (NEW.id, 'Renda', '#4ade80', '💰', 'entrada'),
    (NEW.id, 'Igreja', '#a78bfa', '⛪', 'saida'),
    (NEW.id, 'Casa', '#38bdf8', '🏠', 'saida'),
    (NEW.id, 'Família', '#fb923c', '👨‍👩‍👧‍👦', 'saida'),
    (NEW.id, 'Filhas', '#f472b6', '👧', 'saida'),
    (NEW.id, 'Transporte', '#ef4444', '🚗', 'saida'),
    (NEW.id, 'Alimentação', '#facc15', '🍽️', 'saida'),
    (NEW.id, 'Educação', '#2dd4bf', '📚', 'saida'),
    (NEW.id, 'Tecnologia', '#818cf8', '💻', 'saida'),
    (NEW.id, 'Saúde/Bem-estar', '#34d399', '🏥', 'saida'),
    (NEW.id, 'Impostos', '#e879f9', '🏛️', 'saida'),
    (NEW.id, 'Telefone', '#fbbf24', '📱', 'saida'),
    (NEW.id, 'Mercado', '#06b6d4', '🛒', 'saida'),
    (NEW.id, 'Cartão', '#22d3ee', '💳', 'saida'),
    (NEW.id, 'Serviços', '#f97316', '🔧', 'saida'),
    (NEW.id, 'Outros', '#94a3b8', '📦', 'ambos');

  INSERT INTO metodos_pagamento (user_id, nome, cor) VALUES
    (NEW.id, 'PIX', '#ef4444'),
    (NEW.id, 'Boleto', '#fb923c'),
    (NEW.id, 'Crédito PagSeguro', '#4ade80'),
    (NEW.id, 'Crédito PicPay', '#38bdf8'),
    (NEW.id, 'Débito', '#facc15'),
    (NEW.id, 'TED', '#a78bfa'),
    (NEW.id, 'Dinheiro', '#22c55e');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.seed_user_defaults();
```

</details>

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com a URL e chave do seu projeto Supabase (encontra em **Settings → API**).

### 4. Rode localmente

```bash
npm run dev
```

Acesse **http://localhost:5173** 🎉

## ☁️ Deploy no Vercel

1. Suba o projeto no GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy automático a cada `git push` ✅

## 📁 Estrutura

```
rs-finance/
├── index.html              # HTML shell
├── src/
│   ├── main.js             # App principal (auth routing, dashboard, tabela)
│   ├── auth.js             # Tela de login/registro
│   ├── data.js             # CRUD + agregações via Supabase
│   ├── charts.js           # Gráficos Chart.js (doughnut)
│   ├── transacao-form.js   # Modal de nova transação
│   ├── style.css           # Design system dark premium
│   └── lib/
│       └── supabase.js     # Cliente Supabase
├── .env.example            # Template de variáveis
├── vercel.json             # Config do Vercel (SPA rewrite)
└── package.json
```

## 📄 Licença

MIT © Robson Santiago
