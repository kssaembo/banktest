-- Restored ClassBank project add-ons.
-- Target: xjgvhmlxrqsuwtidooyp. Adds new objects only; existing ClassBank data is not rewritten.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
SELECT pg_advisory_xact_lock(hashtextextended('classbank-restored-addons-v1', 0));

DO $$
BEGIN
  IF to_regclass('public.teachers') IS NULL
     OR to_regclass('public.users') IS NULL
     OR to_regclass('public.accounts') IS NULL
     OR to_regprocedure('public.mart_transfer(text,numeric,text)') IS NULL THEN
    RAISE EXCEPTION 'CLASSBANK_BASE_SCHEMA_REQUIRED';
  END IF;
END $$;

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
DROP POLICY IF EXISTS classbank_app_access ON public.mart_items;
CREATE POLICY classbank_app_access ON public.mart_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mart_items TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.classbank_reward_settings (
  teacher_id uuid PRIMARY KEY REFERENCES public.teachers(id),
  news integer NOT NULL DEFAULT 0 CHECK(news BETWEEN 0 AND 1000000),
  reading integer NOT NULL DEFAULT 0 CHECK(reading BETWEEN 0 AND 1000000)
);
CREATE TABLE IF NOT EXISTS public.classbank_learning_completions (
  student_id text NOT NULL REFERENCES public.users("userId"),
  kind text NOT NULL CHECK(kind IN ('news','reading')),
  chapter_id text NOT NULL,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id),
  reward integer NOT NULL CHECK(reward >= 0),
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  PRIMARY KEY(student_id,kind,chapter_id)
);
CREATE TABLE IF NOT EXISTS public.classbank_typing_badges (
  student_id text NOT NULL REFERENCES public.users("userId"),
  badge_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(student_id,badge_id)
);
ALTER TABLE public.classbank_reward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classbank_learning_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classbank_typing_badges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.classbank_reward_settings, public.classbank_learning_completions, public.classbank_typing_badges FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.classbank_learning_settings(p_teacher uuid,p_news integer DEFAULT NULL,p_reading integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.teachers WHERE id=p_teacher) THEN RAISE EXCEPTION '교사 정보가 없습니다.'; END IF;
 IF p_news IS NOT NULL OR p_reading IS NOT NULL THEN
  IF p_news IS NULL OR p_reading IS NULL OR p_news NOT BETWEEN 0 AND 1000000 OR p_reading NOT BETWEEN 0 AND 1000000 THEN RAISE EXCEPTION '보상액을 확인해 주세요.'; END IF;
  INSERT INTO public.classbank_reward_settings VALUES(p_teacher,p_news,p_reading) ON CONFLICT(teacher_id) DO UPDATE SET news=excluded.news,reading=excluded.reading;
 END IF;
 RETURN COALESCE((SELECT jsonb_build_object('news',news,'reading',reading) FROM public.classbank_reward_settings WHERE teacher_id=p_teacher),'{"news":0,"reading":0}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.classbank_submit_news_learning(p_student text,p_article uuid,p_content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE t uuid; title text; recipient text; treasury text; r public.classbank_learning_completions%ROWTYPE;
 prior_comment uuid; already boolean; amount integer; description text; updated integer;
BEGIN
 IF p_content IS NULL OR length(trim(p_content)) NOT BETWEEN 20 AND 5000 THEN RAISE EXCEPTION '의견을 20~5,000자로 입력해 주세요.'; END IF;
 SELECT teacher_id INTO t FROM public.users WHERE "userId"=p_student AND role='student';
 IF t IS NULL THEN RAISE EXCEPTION '학생 정보가 없습니다.'; END IF;
 SELECT a.title INTO title FROM public.news_articles a WHERE id=p_article AND teacher_id=t::text AND is_approved;
 IF title IS NULL THEN RAISE EXCEPTION '이 학급에 공개된 기사가 아닙니다.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('classbank-learning:'||p_student||':'||p_article::text,0));
 SELECT id INTO prior_comment FROM public.news_comments WHERE "userId"=p_student AND article_id=p_article ORDER BY created_at LIMIT 1;
 SELECT * INTO r FROM public.classbank_learning_completions WHERE student_id=p_student AND kind='news' AND chapter_id=p_article::text FOR UPDATE;
 already:=FOUND;
 IF NOT already THEN
  SELECT COALESCE((SELECT news FROM public.classbank_reward_settings WHERE teacher_id=t),0) INTO amount;
  INSERT INTO public.classbank_learning_completions(student_id,kind,chapter_id,teacher_id,reward,paid,paid_at)
  VALUES(p_student,'news',p_article::text,t,CASE WHEN prior_comment IS NOT NULL THEN 0 ELSE amount END,prior_comment IS NOT NULL OR amount=0,CASE WHEN prior_comment IS NOT NULL OR amount=0 THEN now() END) RETURNING * INTO r;
 END IF;
 IF prior_comment IS NULL THEN
  INSERT INTO public.news_comments("userId",article_id,content,is_passed) VALUES(p_student,p_article,trim(p_content),true);
 ELSE
  UPDATE public.news_comments SET content=trim(p_content),is_passed=true WHERE id=prior_comment;
 END IF;
 IF r.paid THEN RETURN jsonb_build_object('reward',0,'pending',false,'repeated',already OR prior_comment IS NOT NULL); END IF;
 SELECT "accountId" INTO recipient FROM public.accounts WHERE "userId"=p_student AND teacher_id=t AND account_type IN ('student','personal');
 SELECT "accountId" INTO treasury FROM public.accounts WHERE teacher_id=t AND account_type='treasury';
 IF recipient IS NULL OR treasury IS NULL OR recipient=treasury THEN RAISE EXCEPTION '보상 계좌를 확인해 주세요.'; END IF;
 PERFORM 1 FROM public.accounts WHERE "accountId" IN(recipient,treasury) ORDER BY "accountId" FOR UPDATE;
 UPDATE public.accounts SET balance=balance-r.reward WHERE "accountId"=treasury AND balance>=r.reward;
 GET DIAGNOSTICS updated=ROW_COUNT;
 IF updated=0 THEN RETURN jsonb_build_object('reward',0,'pending',true,'repeated',already); END IF;
 UPDATE public.accounts SET balance=balance+r.reward WHERE "accountId"=recipient;
 description:='경제뉴스: '||title||' 이수 보상';
 INSERT INTO public.transactions("accountId",type,amount,description,teacher_id,"senderId","receiverId") VALUES
 (treasury,'Transfer',-r.reward,description,t,treasury,recipient),
 (recipient,'Transfer',r.reward,description,t,treasury,recipient);
 UPDATE public.classbank_learning_completions SET paid=true,paid_at=now() WHERE student_id=p_student AND kind='news' AND chapter_id=p_article::text;
 RETURN jsonb_build_object('reward',r.reward,'pending',false,'repeated',already);
END $$;

CREATE OR REPLACE FUNCTION public.classbank_sync_typing_badges(p_student text,p_badges text[] DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE "userId"=p_student AND role='student') THEN RAISE EXCEPTION '학생을 선택해 주세요.'; END IF;
 IF cardinality(p_badges)>100 THEN RAISE EXCEPTION '배지 개수를 확인해 주세요.'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_badges) b WHERE b IS NULL OR b NOT IN ('coin_10','coin_50','coin_100','coin_500','coin_copper','coin_silver','coin_gold','coin_ancient','coin_lucky','coin_rainbow','bill_1000','bill_5000','bill_10000','bill_50000','bill_check','bill_pocket','bill_wallet','bill_credit','bill_safe','bill_passport','jewel_ruby','jewel_sapphire','jewel_emerald','jewel_topaz','jewel_amethyst','jewel_garnet','jewel_pearl','jewel_crown','jewel_trophy','jewel_diamond')) THEN RAISE EXCEPTION '알 수 없는 배지입니다.'; END IF;
 INSERT INTO public.classbank_typing_badges(student_id,badge_id) SELECT p_student,b FROM unnest(p_badges) b ON CONFLICT DO NOTHING;
 RETURN COALESCE((SELECT jsonb_agg(badge_id ORDER BY badge_id) FROM public.classbank_typing_badges WHERE student_id=p_student),'[]'::jsonb);
END $$;

CREATE TABLE IF NOT EXISTS public.classbank_mart_receipts (
 id uuid PRIMARY KEY,
 teacher_id uuid NOT NULL REFERENCES public.teachers(id),
 account_id text NOT NULL,
 amount numeric NOT NULL,
 cart jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.classbank_mart_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.classbank_mart_receipts FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.classbank_mart_checkout(p_account text,p_amount numeric,p_cart jsonb,p_request uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE t uuid; mart text; subtotal numeric; valid_count integer; requested_count integer; result text; old public.classbank_mart_receipts%ROWTYPE;
BEGIN
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

CREATE OR REPLACE FUNCTION public.classbank_mart_sales(p_teacher uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 RETURN COALESCE((SELECT jsonb_object_agg(item,qty) FROM (SELECT q.key item,sum(q.value::integer) qty FROM public.classbank_mart_receipts r CROSS JOIN LATERAL jsonb_each_text(r.cart) q WHERE r.teacher_id=p_teacher GROUP BY q.key)s),'{}'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.classbank_learning_settings(uuid,integer,integer), public.classbank_submit_news_learning(text,uuid,text), public.classbank_sync_typing_badges(text,text[]), public.classbank_mart_checkout(text,numeric,jsonb,uuid), public.classbank_mart_sales(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.classbank_learning_settings(uuid,integer,integer), public.classbank_submit_news_learning(text,uuid,text), public.classbank_sync_typing_badges(text,text[]), public.classbank_mart_checkout(text,numeric,jsonb,uuid), public.classbank_mart_sales(uuid) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

SELECT 'RESTORED_PROJECT_ADDONS_READY' AS status;
