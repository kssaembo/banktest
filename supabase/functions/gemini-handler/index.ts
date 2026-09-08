
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai@^1.34.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const models = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
];

function isTemporaryModelError(error: any) {
  const message = String(error?.message || error);
  return message.includes('503') || message.includes('UNAVAILABLE') || message.includes('high demand');
}

async function generateWithFallback(ai: any, contents: any, config: any) {
  let lastError: any;
  for (const model of models) {
    try {
      return await ai.models.generateContent({ model, contents, config });
    } catch (error: any) {
      if (!isTemporaryModelError(error)) throw error;
      lastError = error;
      console.warn(`Gemini model unavailable: ${model}`);
    }
  }
  throw lastError || new Error('All Gemini fallback models are unavailable.');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json()
    
    const apiKey = (globalThis as any).Deno.env.get("GEMINI_API_KEY")?.trim();
    if (!apiKey) throw new Error("Supabase Secrets에 GEMINI_API_KEY를 등록해주세요.");
    
    const ai = new GoogleGenAI({ apiKey });
    let prompt = "";
    let responseSchema: any = null;

    if (action === 'recommend_news') {
      const rawNewsList = JSON.stringify(payload.rawNews).substring(0, 24000);
      prompt = `당신은 초등 경제 전문 에디터입니다. 아래 뉴스 중 원문 본문(originalContent)이 충분한 기사 최대 5개를 고르세요. 각 content는 원문의 핵심 사실·수치·원인·결과를 빠뜨리지 말고 원문 정보량의 약 60~70%(약 2/3)가 남도록 800~1,400자, 6~12개 짧은 문단으로 작성하세요. 문장을 초등 4~6학년이 이해할 표현으로 순화하되 지나치게 요약하거나 새로운 사실을 만들지 마세요. 원문 문장을 길게 복제하지 말고 반드시 새 문장으로 바꾸세요. 원문이 부족한 기사는 description을 근거로 짧게 추측해 늘리지 말고 제외하세요. title은 어린이용으로 자연스럽게 다듬고 url과 핵심 keywords 2~4개를 유지하세요.\n\n[뉴스 목록]\n${rawNewsList}`;
      responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            url: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "content", "url", "keywords"]
        }
      };
    } else if (action === 'summarize') {
      // Truncate content to 2000 chars
      const content = payload.content.substring(0, 2000);
      prompt = `초등학생을 위해 다음 뉴스를 3줄 요약하고, 어려운 단어 3개를 골라 아주 쉽게 설명해주세요.\n뉴스 제목: ${payload.title}\n뉴스 내용: ${content}`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          easy_words: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                meaning: { type: Type.STRING }
              },
              required: ["word", "meaning"]
            }
          }
        },
        required: ["summary", "easy_words"]
      };
    } else if (action === 'verify') {
      prompt = `댓글 검수 선생님 페르소나로 다음 댓글을 검수하세요.\n키워드: ${payload.keywords.join(', ')}\n기사: ${payload.articleContent.substring(0, 1000)}\n댓글: ${payload.comment}`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          passed: { type: Type.BOOLEAN },
          reason: { type: Type.STRING }
        },
        required: ["passed", "reason"]
      };
    } else {
      throw new Error(`Unsupported action: ${String(action)}`);
    }

    const result = await generateWithFallback(ai, prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    });
    const text = result.text;
    if (!text) throw new Error('Gemini returned an empty response.');
    return new Response(text, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      },
    })
  } catch (error: any) {
    console.error("Gemini Handler Error:", error.message);
    const raw=String(error?.message||error);
    const depleted=raw.includes('prepayment credits are depleted');
    const quota=depleted||raw.includes('RESOURCE_EXHAUSTED')||raw.includes('429');
    const invalidKey=raw.includes('API_KEY_INVALID')||raw.includes('API key not valid');
    const unavailable=isTemporaryModelError(error);
    const message=invalidKey ? 'Gemini API 키가 유효하지 않습니다. Supabase Secrets의 GEMINI_API_KEY 값을 Google AI Studio에서 발급한 유효한 키로 확인해주세요.' : depleted ? 'Gemini 선불 크레딧이 소진되었습니다. Google AI Studio 결제 설정을 확인해주세요.' : quota ? 'Gemini 요청 한도를 초과했습니다. 잠시 후 다시 시도하거나 Google AI Studio에서 프로젝트 한도를 확인해주세요.' : unavailable ? 'Gemini 모델이 일시적으로 혼잡합니다. 잠시 후 다시 시도해주세요.' : raw;
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: invalidKey ? 400 : quota ? 429 : unavailable ? 503 : 500
    })
  }
})
