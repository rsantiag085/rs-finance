-- Incrementa valor_atual de uma meta de forma atômica (evita race condition)
-- Execute no Supabase SQL Editor antes de usar o app.
CREATE OR REPLACE FUNCTION incrementar_valor_meta(
  p_meta_id uuid,
  p_valor   numeric
)
RETURNS metas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_meta metas;
BEGIN
  UPDATE metas
  SET valor_atual = valor_atual + p_valor,
      updated_at  = now()
  WHERE id = p_meta_id
  RETURNING * INTO v_meta;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meta não encontrada: %', p_meta_id;
  END IF;

  RETURN v_meta;
END;
$$;
