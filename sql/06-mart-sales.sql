-- Test project only. Existing mart_transfer is called, never replaced.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM classbank_test_control.installation WHERE singleton AND declared_project_ref='hoktiaduvzoaeapymuqw' AND stage='tester-access-ready') THEN RAISE EXCEPTION 'TEST_PROJECT_REQUIRED'; END IF;
END $$;
CREATE TABLE public.classbank_mart_receipts(
 id uuid PRIMARY KEY,
 teacher_id uuid NOT NULL REFERENCES public.teachers(id),
 account_id text NOT NULL,
 amount numeric NOT NULL,
 cart jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.classbank_mart_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.classbank_mart_receipts FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.classbank_mart_checkout(p_account text,p_amount numeric,p_cart jsonb,p_request uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE t uuid; mart text; subtotal numeric; valid_count integer; requested_count integer; result text; old public.classbank_mart_receipts%ROWTYPE;
BEGIN
 IF NOT classbank_test_control.is_tester() THEN RAISE EXCEPTION 'TEST_ACCESS_DENIED'; END IF;
 IF p_request IS NULL OR p_amount IS NULL OR p_amount<=0 OR p_amount<>round(p_amount) OR p_cart IS NULL OR jsonb_typeof(p_cart)<>'object' THEN RAISE EXCEPTION '결제 정보를 확인해 주세요.'; END IF;
 SELECT a.teacher_id INTO t FROM public.accounts a JOIN public.users u ON u."userId"=a."userId" WHERE a."accountId"=p_account AND u.role='student';
 IF t IS NULL THEN RAISE EXCEPTION '학생 계좌가 아닙니다.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('mart-receipt:'||p_request::text,0));
 SELECT * INTO old FROM public.classbank_mart_receipts WHERE id=p_request;
 IF FOUND THEN
  IF old.account_id<>p_account OR old.amount<>p_amount OR old.cart<>p_cart THEN RAISE EXCEPTION '결제 요청이 변경되었습니다.'; END IF;
  RETURN '이미 완료된 결제입니다. 중복 출금하지 않았습니다.';
 END IF;
 SELECT count(*) INTO requested_count FROM jsonb_each_text(p_cart);
 IF requested_count NOT BETWEEN 1 AND 200 OR EXISTS(SELECT 1 FROM jsonb_each_text(p_cart) q WHERE q.value !~ '^[1-9][0-9]{0,3}$') THEN RAISE EXCEPTION '수량을 확인해 주세요.'; END IF;
 SELECT count(*),sum(i.price*q.value::integer) INTO valid_count,subtotal FROM jsonb_each_text(p_cart) q JOIN public.mart_items i ON i.id::text=q.key WHERE i.teacher_id=t AND i.is_active;
 IF valid_count<>requested_count OR subtotal>p_amount THEN RAISE EXCEPTION '선택 상품의 가격·수량을 확인해 주세요. 직접 금액을 줄이려면 상품 선택을 초기화해 주세요.'; END IF;
 SELECT "accountId" INTO mart FROM public.accounts WHERE teacher_id=t AND account_type='mart';
 IF mart IS NULL THEN RAISE EXCEPTION '마트 계좌가 없습니다.'; END IF;
 PERFORM 1 FROM public.accounts WHERE "accountId" IN(p_account,mart) ORDER BY "accountId" FOR UPDATE;
 IF (SELECT balance FROM public.accounts WHERE "accountId"=p_account)<p_amount THEN RAISE EXCEPTION '학생 잔액이 부족합니다.'; END IF;
 result:=public.mart_transfer(p_account,p_amount,'FROM_STUDENT');
 INSERT INTO public.classbank_mart_receipts VALUES(p_request,t,p_account,p_amount,p_cart,now());
 RETURN result;
END $$;
CREATE FUNCTION public.classbank_mart_sales(p_teacher uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT classbank_test_control.is_tester() THEN RAISE EXCEPTION 'TEST_ACCESS_DENIED'; END IF;
 RETURN COALESCE((SELECT jsonb_object_agg(item,qty) FROM (SELECT q.key item,sum(q.value::integer) qty FROM public.classbank_mart_receipts r CROSS JOIN LATERAL jsonb_each_text(r.cart) q WHERE r.teacher_id=p_teacher GROUP BY q.key)s),'{}'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.classbank_mart_checkout(text,numeric,jsonb,uuid),public.classbank_mart_sales(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.classbank_mart_checkout(text,numeric,jsonb,uuid),public.classbank_mart_sales(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
SELECT 'MART_SALES_READY' AS status;
