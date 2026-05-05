/**
 * RS Finance — Data Layer (Supabase)
 */
import { supabase } from './lib/supabase.js';

// ============================================================
// Formatação
// ============================================================
export function formatBRL(valor) {
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// ============================================================
// Categorias
// ============================================================
export async function getCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data;
}

// ============================================================
// Métodos de Pagamento
// ============================================================
export async function getMetodos() {
  const { data, error } = await supabase
    .from('metodos_pagamento')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data;
}

// ============================================================
// Transações
// ============================================================
export async function getTransacoes(mes, ano) {
  let query = supabase
    .from('transacoes')
    .select(`
      *,
      categorias ( id, nome, cor, icone ),
      metodos_pagamento ( id, nome, cor )
    `)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });

  if (mes && ano) {
    const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const endDate = mes === 12
      ? `${ano + 1}-01-01`
      : `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
    query = query.gte('data', startDate).lt('data', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function addTransacao(transacao) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('transacoes')
    .insert({ ...transacao, user_id: user.id })
    .select(`
      *,
      categorias ( id, nome, cor, icone ),
      metodos_pagamento ( id, nome, cor )
    `)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransacao(id) {
  const { error } = await supabase
    .from('transacoes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function updateTransacao(id, updates) {
  const { data, error } = await supabase
    .from('transacoes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      categorias ( id, nome, cor, icone ),
      metodos_pagamento ( id, nome, cor )
    `)
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// Agregações (calculadas no frontend a partir dos dados)
// ============================================================
export function calcularResumo(transacoes) {
  const entradas = transacoes.filter(t => t.tipo === 'entrada');
  const saidas = transacoes.filter(t => t.tipo === 'saida');

  const totalEntradas = entradas.reduce((s, t) => s + Number(t.valor), 0);
  const totalSaidas = saidas.reduce((s, t) => s + Number(t.valor), 0);
  const saldo = totalEntradas - totalSaidas;
  const pctComprometido = totalEntradas > 0 ? (totalSaidas / totalEntradas) * 100 : 0;

  return { totalEntradas, totalSaidas, saldo, pctComprometido, totalTransacoes: transacoes.length };
}

export function agruparPorCategoria(transacoes, tipo = 'saida') {
  const filtradas = transacoes.filter(t => t.tipo === tipo);
  const mapa = {};

  filtradas.forEach(t => {
    const cat = t.categorias;
    const key = cat ? cat.nome : 'Sem categoria';
    const cor = cat ? cat.cor : '#94a3b8';
    if (!mapa[key]) mapa[key] = { label: key, valor: 0, cor };
    mapa[key].valor += Number(t.valor);
  });

  return Object.values(mapa)
    .map(d => ({ ...d, valor: Math.round(d.valor * 100) / 100 }))
    .sort((a, b) => b.valor - a.valor);
}

export function agruparPorMetodo(transacoes) {
  const saidas = transacoes.filter(t => t.tipo === 'saida');
  const mapa = {};

  saidas.forEach(t => {
    const met = t.metodos_pagamento;
    const key = met ? met.nome : 'Não informado';
    const cor = met ? met.cor : '#94a3b8';
    if (!mapa[key]) mapa[key] = { label: key, valor: 0, cor };
    mapa[key].valor += Number(t.valor);
  });

  return Object.values(mapa)
    .map(d => ({ ...d, valor: Math.round(d.valor * 100) / 100 }))
    .sort((a, b) => b.valor - a.valor);
}

export function dadosFluxo(resumo) {
  return [
    { label: 'Entrada', valor: resumo.totalEntradas, cor: '#4ade80' },
    { label: 'Saída', valor: resumo.totalSaidas, cor: '#ef4444' },
  ];
}
