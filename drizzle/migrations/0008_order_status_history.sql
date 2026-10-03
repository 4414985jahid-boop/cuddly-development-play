CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status public.order_status,
  new_status public.order_status NOT NULL,
  delivered_qty integer,
  refund numeric NOT NULL DEFAULT 0,
  note text,
  action_by text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_status_history_order_idx ON public.order_status_history(order_id, created_at);
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own order history" ON public.order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_update_order_status(_order_id uuid, _status public.order_status, _delivered integer, _note text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare _o orders; _refund numeric := 0; _target numeric; _newbal numeric; _del integer; _title text;
begin
  select * into _o from orders where id=_order_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  _note := nullif(left(trim(coalesce(_note,'')),500),'');
  if _o.status = 'pending' and _status not in ('processing','rejected') then raise exception 'INVALID_TRANSITION'; end if;
  if _o.status = 'processing' and _status not in ('completed','partial','rejected') then raise exception 'INVALID_TRANSITION'; end if;
  if _o.status not in ('pending','processing') then raise exception 'INVALID_TRANSITION'; end if;
  _del := _o.delivered_qty;
  if _status = 'partial' then
    if _delivered is null or _delivered <= 0 or _delivered >= _o.quantity then raise exception 'INVALID_DELIVERED'; end if;
    _del := _delivered;
    _target := floor(_o.charge * (_o.quantity - _delivered) / _o.quantity * 100) / 100;
  elsif _status = 'rejected' then
    _target := _o.charge;
  elsif _status = 'completed' then
    _del := _o.quantity; _target := _o.refunded;
  else
    _target := _o.refunded;
  end if;
  _refund := greatest(round(_target - _o.refunded, 2), 0);
  if _refund > 0 then
    update profiles set balance = balance + _refund where id=_o.user_id returning balance into _newbal;
    insert into wallet_ledger (user_id,amount,kind,ref,balance_after) values (_o.user_id,_refund,'refund',_o.order_code,_newbal);
  end if;
  update orders set status=_status, refunded=_o.refunded+_refund, delivered_qty=_del, admin_note=coalesce(_note, admin_note), updated_at=now() where id=_o.id;
  insert into order_status_history (order_id,old_status,new_status,delivered_qty,refund,note)
  values (_o.id,_o.status,_status,_del,_refund,_note);
  _title := 'Order #' || _o.order_code || ' ' || case _status when 'processing' then 'is now processing' when 'completed' then 'completed' when 'partial' then 'partially completed' when 'rejected' then 'was rejected' else _status::text end;
  insert into notifications (user_id,title,body,kind) values (_o.user_id, _title,
    concat_ws(E'\n', _o.service_name || ' × ' || _o.quantity,
      case when _refund > 0 then 'Refunded $' || to_char(_refund,'FM999999990.00') || ' to your balance.' end, _note), 'notification');
  return json_build_object('refund', _refund, 'status', _status);
end $$;
REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid, public.order_status, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, public.order_status, integer, text) TO service_role;