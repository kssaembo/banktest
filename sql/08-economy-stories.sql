-- 경제 이야기는 기존 금융 테이블과 분리된 부가기능입니다.
create table if not exists public.economy_story_topics (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  prompt text not null check (char_length(prompt) between 1 and 500),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.economy_story_comments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.economy_story_topics(id) on delete cascade,
  student_id text not null references public.users("userId") on delete cascade,
  content text not null check (char_length(content) between 1 and 300),
  created_at timestamptz not null default now(),
  unique(topic_id, student_id)
);

alter table public.economy_story_topics enable row level security;
alter table public.economy_story_comments enable row level security;
revoke all on public.economy_story_topics, public.economy_story_comments from anon, authenticated;

create or replace function public.get_economy_story_topics(p_teacher text)
returns table(id uuid,title text,prompt text,is_open boolean,created_at timestamptz,comment_count bigint)
language sql security definer set search_path=public as $$
 select t.id,t.title,t.prompt,t.is_open,t.created_at,count(c.id)
 from economy_story_topics t left join economy_story_comments c on c.topic_id=t.id
 where t.teacher_id::text=p_teacher group by t.id order by t.created_at desc;
$$;

create or replace function public.create_economy_story(p_teacher text,p_title text,p_prompt text)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if not exists(select 1 from teachers where id::text=p_teacher) then raise exception '교사 정보를 확인할 수 없습니다.'; end if;
 insert into economy_story_topics(teacher_id,title,prompt) values(p_teacher::uuid,trim(p_title),trim(p_prompt)) returning id into result;
 return result;
end; $$;

create or replace function public.set_economy_story_status(p_teacher text,p_topic uuid,p_is_open boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 update economy_story_topics set is_open=p_is_open where id=p_topic and teacher_id::text=p_teacher;
 if not found then raise exception '게시물을 변경할 권한이 없습니다.'; end if;
end; $$;

create or replace function public.get_economy_story_comments(p_topic uuid)
returns table(id uuid,content text,created_at timestamptz,user_name text,user_number integer)
language sql security definer set search_path=public as $$
 select c.id,c.content,c.created_at,u.name,u.number from economy_story_comments c
 join users u on u."userId"=c.student_id where c.topic_id=p_topic order by c.created_at desc;
$$;

create or replace function public.add_economy_story_comment(p_topic uuid,p_student text,p_content text)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if not exists(select 1 from economy_story_topics t join users u on u."userId"=p_student
   where t.id=p_topic and t.is_open and u.role='student' and u.teacher_id=t.teacher_id) then
   raise exception '이 주제에 의견을 등록할 수 없습니다.';
 end if;
 insert into economy_story_comments(topic_id,student_id,content) values(p_topic,p_student,trim(p_content))
 on conflict(topic_id,student_id) do update set content=excluded.content,created_at=now() returning id into result;
 return result;
end; $$;

grant execute on function public.get_economy_story_topics(text) to anon,authenticated;
grant execute on function public.create_economy_story(text,text,text) to anon,authenticated;
grant execute on function public.set_economy_story_status(text,uuid,boolean) to anon,authenticated;
grant execute on function public.get_economy_story_comments(uuid) to anon,authenticated;
grant execute on function public.add_economy_story_comment(uuid,text,text) to anon,authenticated;
