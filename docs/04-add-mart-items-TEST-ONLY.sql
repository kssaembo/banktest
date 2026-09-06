-- TEST PROJECT ONLY: hoktiaduvzoaeapymuqw
-- 마트 품목 목록만 추가합니다. 기존 거래·계좌·학생 데이터는 수정하지 않습니다.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.mart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  price numeric(14,2) NOT NULL CHECK (price > 0),
  category text NOT NULL DEFAULT '기타' CHECK (length(trim(category)) BETWEEN 1 AND 30),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mart_items_teacher_order_idx ON public.mart_items(teacher_id, sort_order, created_at);
ALTER TABLE public.mart_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mart_items FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS tester_only ON public.mart_items;
DROP POLICY IF EXISTS tester_access ON public.mart_items;
CREATE POLICY tester_only ON public.mart_items AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT classbank_test_control.is_tester()))
  WITH CHECK ((SELECT classbank_test_control.is_tester()));
CREATE POLICY tester_access ON public.mart_items FOR ALL TO authenticated
  USING ((SELECT classbank_test_control.is_tester()))
  WITH CHECK ((SELECT classbank_test_control.is_tester()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mart_items TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT 'MART_ITEMS_READY' AS status, count(*) AS items FROM public.mart_items;
