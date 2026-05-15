/**
 * RS Finance — Metas (data layer)
 */
import { supabase } from './lib/supabase.js';

export async function getMetas() {
  const { data, error } = await supabase
    .from('metas')
    .select('*')
    .eq('concluida', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addMeta(meta) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('metas')
    .insert({ ...meta, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMeta(id) {
  const { error } = await supabase.from('metas').delete().eq('id', id);
  if (error) throw error;
}

export async function updateMeta(id, updates) {
  const { data, error } = await supabase
    .from('metas')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function concluirMeta(id) {
  const { error } = await supabase
    .from('metas')
    .update({ concluida: true, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function addDeposito(metaId, deposito, valorAtualMeta) {
  const { data: { user } } = await supabase.auth.getUser();

  const { error: depError } = await supabase
    .from('depositos_meta')
    .insert({ ...deposito, meta_id: metaId, user_id: user.id });
  if (depError) throw depError;

  const novoValor = Number(valorAtualMeta) + Number(deposito.valor);
  const { data, error } = await supabase
    .from('metas')
    .update({ valor_atual: novoValor, updated_at: new Date().toISOString() })
    .eq('id', metaId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
