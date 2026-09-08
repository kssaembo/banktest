import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const cleanText = (html: string) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

async function fetchArticleText(value: string) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)) return '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 ClassBank-NewsReader/1.0' }, redirect: 'follow' });
    clearTimeout(timeout);
    if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) return '';
    const html = (await response.text()).slice(0, 700000);
    const candidates = [
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1],
      html.match(/id=["']dic_area["'][^>]*>([\s\S]*?)<\/div>/i)?.[1],
      html.match(/class=["'][^"']*(?:article_body|article-body|news_body|news-body|article_view)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
    ].filter(Boolean) as string[];
    const text = cleanText(candidates.sort((a,b)=>b.length-a.length)[0] || '');
    return text.length >= 180 ? text.slice(0, 5000) : '';
  } catch { return ''; }
}

serve(async (req) => {
  // CORS 프리플라이트 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { keyword } = await req.json()
    if (typeof keyword !== 'string' || keyword.trim().length < 2 || keyword.length > 80) {
      throw new Error('검색어는 2자 이상 80자 이하로 입력해주세요.');
    }
    
    // Fix: Access Deno through globalThis to resolve "Cannot find name 'Deno'" errors in the execution context
    const clientId = (globalThis as any).Deno.env.get("NAVER_CLIENT_ID");
    const clientSecret = (globalThis as any).Deno.env.get("NAVER_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("네이버 API 키(NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET)가 설정되지 않았습니다.");
    }

    // 네이버 뉴스 검색 API 호출 (최신순 20개 요청)
    const response = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(keyword.trim())}&display=12&sort=sim`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.errorMessage || "네이버 API 호출 중 오류가 발생했습니다.");
    }

    const items = await Promise.all((data.items || []).slice(0, 8).map(async (item: any) => ({
      ...item,
      content: await fetchArticleText(item.originallink || item.link || '')
    })));
    return new Response(JSON.stringify({ ...data, items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    })
  }
})
