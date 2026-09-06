-- ONLY the isolated test project hoktiaduvzoaeapymuqw. No existing function is replaced.
-- This project's tester gate is NOT production student authentication.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM classbank_test_control.installation WHERE singleton AND declared_project_ref='hoktiaduvzoaeapymuqw' AND stage='tester-access-ready') THEN RAISE EXCEPTION 'TEST_PROJECT_REQUIRED'; END IF;
END $$;
CREATE TABLE public.classbank_reward_settings(
 teacher_id uuid PRIMARY KEY REFERENCES public.teachers(id),
 news integer NOT NULL DEFAULT 0 CHECK(news BETWEEN 0 AND 1000000),
 reading integer NOT NULL DEFAULT 0 CHECK(reading BETWEEN 0 AND 1000000)
);
CREATE TABLE public.classbank_learning_completions(
 student_id text NOT NULL REFERENCES public.users("userId"),
 kind text NOT NULL CHECK(kind IN ('news','reading')),
 chapter_id text NOT NULL,
 teacher_id uuid NOT NULL REFERENCES public.teachers(id),
 reward integer NOT NULL CHECK(reward>=0),
 paid boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 paid_at timestamptz,
 PRIMARY KEY(student_id,kind,chapter_id)
);
CREATE TABLE public.classbank_typing_badges(
 student_id text NOT NULL REFERENCES public.users("userId"),
 badge_id text NOT NULL,
 earned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(student_id,badge_id)
);
ALTER TABLE public.classbank_reward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classbank_learning_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classbank_typing_badges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.classbank_reward_settings,public.classbank_learning_completions,public.classbank_typing_badges FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.classbank_learning_settings(p_teacher uuid,p_news integer DEFAULT NULL,p_reading integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT classbank_test_control.is_tester() THEN RAISE EXCEPTION 'TEST_ACCESS_DENIED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.teachers WHERE id=p_teacher) THEN RAISE EXCEPTION '교사 정보가 없습니다.'; END IF;
 IF p_news IS NOT NULL OR p_reading IS NOT NULL THEN
  IF p_news IS NULL OR p_reading IS NULL OR p_news NOT BETWEEN 0 AND 1000000 OR p_reading NOT BETWEEN 0 AND 1000000 THEN RAISE EXCEPTION '보상액을 확인해 주세요.'; END IF;
  INSERT INTO public.classbank_reward_settings VALUES(p_teacher,p_news,p_reading) ON CONFLICT(teacher_id) DO UPDATE SET news=excluded.news,reading=excluded.reading;
 END IF;
 RETURN COALESCE((SELECT jsonb_build_object('news',news,'reading',reading) FROM public.classbank_reward_settings WHERE teacher_id=p_teacher),'{"news":0,"reading":0}'::jsonb);
END $$;

-- No reading claim endpoint until server-verifiable chapter completion is implemented.
-- Comments are serialized per student/article, including requests from other devices.
CREATE FUNCTION public.classbank_submit_news_learning(p_student text,p_article uuid,p_content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE t uuid; title text; recipient text; treasury text; r public.classbank_learning_completions%ROWTYPE;
 prior_comment uuid; already boolean; amount integer; description text; updated integer;
BEGIN
 IF NOT classbank_test_control.is_tester() THEN RAISE EXCEPTION 'TEST_ACCESS_DENIED'; END IF;
 IF length(trim(p_content)) NOT BETWEEN 20 AND 5000 OR p_content IS NULL THEN RAISE EXCEPTION '의견을 20~5,000자로 입력해 주세요.'; END IF;
 SELECT teacher_id INTO t FROM public.users WHERE "userId"=p_student AND role='student';
 IF t IS NULL THEN RAISE EXCEPTION '학생 정보가 없습니다.'; END IF;
 SELECT a.title INTO title FROM public.news_articles a WHERE id=p_article AND teacher_id=t::text AND is_approved;
 IF title IS NULL THEN RAISE EXCEPTION '이 학급에 공개된 기사가 아닙니다.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('classbank-learning:'||p_student||':'||p_article::text,0));
 SELECT id INTO prior_comment FROM public.news_comments WHERE "userId"=p_student AND article_id=p_article ORDER BY created_at LIMIT 1;
 SELECT * INTO r FROM public.classbank_learning_completions WHERE student_id=p_student AND kind='news' AND chapter_id=p_article::text FOR UPDATE;
 already:=FOUND;
 IF NOT already THEN
  -- Never retroactively reward old comments, whose old +1 may already have been paid.
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
 -- Same deterministic lock ordering for every reward transfer; no negative treasury.
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

CREATE FUNCTION public.classbank_sync_typing_badges(p_student text,p_badges text[] DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT classbank_test_control.is_tester() THEN RAISE EXCEPTION 'TEST_ACCESS_DENIED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE "userId"=p_student AND role='student') THEN RAISE EXCEPTION '학생을 선택해 주세요.'; END IF;
 IF cardinality(p_badges)>100 THEN RAISE EXCEPTION '배지 개수를 확인해 주세요.'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_badges) b WHERE b IS NULL OR b NOT IN ('coin_10','coin_50','coin_100','coin_500','coin_copper','coin_silver','coin_gold','coin_ancient','coin_lucky','coin_rainbow','bill_1000','bill_5000','bill_10000','bill_50000','bill_check','bill_pocket','bill_wallet','bill_credit','bill_safe','bill_passport','jewel_ruby','jewel_sapphire','jewel_emerald','jewel_topaz','jewel_amethyst','jewel_garnet','jewel_pearl','jewel_crown','jewel_trophy','jewel_diamond')) THEN RAISE EXCEPTION '알 수 없는 배지입니다.'; END IF;
 INSERT INTO public.classbank_typing_badges(student_id,badge_id) SELECT p_student,b FROM unnest(p_badges) b ON CONFLICT DO NOTHING;
 RETURN COALESCE((SELECT jsonb_agg(badge_id ORDER BY badge_id) FROM public.classbank_typing_badges WHERE student_id=p_student),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.classbank_learning_settings(uuid,integer,integer),public.classbank_submit_news_learning(text,uuid,text),public.classbank_sync_typing_badges(text,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.classbank_learning_settings(uuid,integer,integer),public.classbank_submit_news_learning(text,uuid,text),public.classbank_sync_typing_badges(text,text[]) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
SELECT 'LEARNING_ADDONS_READY' AS status;
