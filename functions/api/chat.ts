import { embeddedChunks } from '../_generated/kb-embedded';

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type Env = {
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
  TAVILY_API_KEY?: string;
};

type Source = {
  title: string;
  url: string;
};

type KbChunk = {
  source: string;
  url: string;
  heading: string;
  content: string;
};

const MAX_MESSAGE_CHARS = 800;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SITE_CONTEXT = `你是 BVI.vg 的中文知识库助手。你的任务是帮助用户理解 BVI 商业公司、VISTA 信托、PTC、SPC、经济实质、CRS 2.0、UBO、FATF、B+H 架构，以及 BVI 与中国外汇/税务/合规框架的衔接。

回答原则：
1. 用中文回答，除非用户明确要求英文。
2. 优先基于 BVI.vg 内置 Markdown 知识库、BVI.vg 页面和 Tavily 检索结果回答。
3. 不编造法律条文、生效日期、官方结论、银行政策或监管口径；不确定时明确说“不确定，需要核验官方来源”。
4. 不提供个案法律、税务、投资、外汇或信托意见；涉及具体行动时建议咨询 BVI 持牌律师、中国税务律师或外汇合规顾问。
5. 不承诺开户成功、税负结果、备案结果、信托保护结果或任何监管处理结果。
6. 不帮助用户设计规避监管、隐瞒受益人、逃税、规避 CRS、规避 KYC 或隐藏资金来源的方案。遇到这类请求，应转向解释合规路径和风险。
7. 对合法合规问题，回答要简洁、结构清楚、直接解决问题。`;

const FALLBACK_SOURCES: Array<Source & { keywords: string[] }> = [
  { title: 'BVI 2.0 总纲', url: 'https://bvi.vg/bvi-2-0/', keywords: ['bvi 2.0', '总纲', '合规时代', '留钱', '藏钱'] },
  { title: 'CRS 2.0 专题', url: 'https://bvi.vg/bvi-2-0/crs-2/', keywords: ['crs', 'crs 2.0', '信息交换', '加密资产', '税务居民'] },
  { title: '常见误读澄清', url: 'https://bvi.vg/bvi-2-0/myths/', keywords: ['误读', '公开', '查册', 'ubo', '灰名单', 'fatf', '不能用'] },
  { title: 'B+H 2.0 架构', url: 'https://bvi.vg/bvi-2-0/b-plus-h/', keywords: ['b+h', '香港', '架构', '银行账户', '控股'] },
  { title: '法规更新追踪', url: 'https://bvi.vg/bvi-2-0/regulatory-timeline/', keywords: ['法规', '时间轴', 'far', '经济实质', '正当利益', '2026', '2025'] },
  { title: '与中国法律衔接', url: 'https://bvi.vg/bvi-2-0/china-connection/', keywords: ['中国', '外汇', 'odi', '37号文', 'cfc', '税务'] },
  { title: 'BVI 2.0 FAQ', url: 'https://bvi.vg/bvi-2-0/faq/', keywords: ['faq', '问题', '怎么办', '影响'] },
  { title: '官方来源', url: 'https://bvi.vg/bvi-2-0/sources/', keywords: ['官方', '来源', '链接', '机构', '假站', 'fsc', 'ita'] },
];

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

function sanitizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((item): item is ChatMessage => {
      if (!item || typeof item !== 'object') return false;
      const message = item as Partial<ChatMessage>;
      return (
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0
      );
    })
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, MAX_MESSAGE_CHARS),
    }));
}

function tokenize(text: string) {
  const lower = text.toLowerCase();
  const latin = lower.match(/[a-z0-9.+-]{2,}/g) || [];
  const chinese = lower.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const chars = lower.match(/[\u4e00-\u9fff]/g) || [];
  return [...new Set([...latin, ...chinese, ...chars])];
}

function scoreChunk(queryTokens: string[], chunk: KbChunk) {
  const haystack = `${chunk.source} ${chunk.heading} ${chunk.content}`.toLowerCase();
  let score = 0;

  for (const token of queryTokens) {
    if (!token) continue;
    if (haystack.includes(token)) score += token.length > 1 ? 3 : 1;
    if (chunk.source.toLowerCase().includes(token)) score += 2;
    if (chunk.heading.toLowerCase().includes(token)) score += 2;
  }

  return score;
}

function searchEmbeddedKb(query: string) {
  const queryTokens = tokenize(query);
  const chunks = (embeddedChunks as readonly KbChunk[])
    .map((chunk) => ({ chunk, score: scoreChunk(queryTokens, chunk) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.chunk);

  const context = chunks.length
    ? `\n\n以下是 BVI.vg 内置 Markdown 知识库检索结果：\n${chunks
        .map((chunk, index) => `[KB ${index + 1}] ${chunk.source}${chunk.heading ? ` / ${chunk.heading}` : ''}\n${chunk.url}\n${chunk.content}`)
        .join('\n\n')}`
    : '';

  const seen = new Set<string>();
  const sources = chunks
    .filter((chunk) => chunk.url)
    .map((chunk) => ({ title: chunk.source, url: chunk.url }))
    .filter((source) => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    });

  return { context, sources };
}

function fallbackSources(query: string): Source[] {
  const lower = query.toLowerCase();
  const matched = FALLBACK_SOURCES.filter((source) => source.keywords.some((keyword) => lower.includes(keyword.toLowerCase())));

  const defaults = [FALLBACK_SOURCES[0], FALLBACK_SOURCES[6], FALLBACK_SOURCES[7]];
  const combined = [...matched, ...defaults];
  const seen = new Set<string>();

  return combined
    .filter((source) => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    })
    .slice(0, 4)
    .map(({ title, url }) => ({ title, url }));
}

async function searchTavily(query: string, apiKey?: string): Promise<{ context: string; sources: Source[] }> {
  const fallback = fallbackSources(query);

  if (!apiKey || !query.trim()) return { context: '', sources: fallback };

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: `site:bvi.vg ${query}`,
        search_depth: 'basic',
        max_results: 5,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) return { context: '', sources: fallback };

    const data = await response.json() as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };

    const items = (data.results || []).slice(0, 5);

    const tavilySources = items
      .filter((item) => Boolean(item.url))
      .map((item) => ({
        title: item.title || 'BVI.vg 参考页面',
        url: item.url || '',
      }));

    const results = items
      .map((item, index) => {
        const title = item.title || 'Untitled';
        const url = item.url || '';
        const content = (item.content || '').replace(/\s+/g, ' ').slice(0, 700);
        return `[${index + 1}] ${title}\n${url}\n${content}`;
      })
      .join('\n\n');

    return {
      context: results ? `\n\n以下是 Tavily 检索到的 BVI.vg 相关资料：\n${results}` : '',
      sources: tavilySources.length ? tavilySources : fallback,
    };
  } catch {
    return { context: '', sources: fallback };
  }
}

function mergeSources(...groups: Source[][]) {
  const seen = new Set<string>();
  return groups
    .flat()
    .filter((source) => {
      if (!source.url || seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    })
    .slice(0, 5);
}

function sourceFrame(sources: Source[]) {
  return `data: ${JSON.stringify({ type: 'sources', sources })}\n\n`;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (!env.DEEPSEEK_API_KEY) {
    return jsonResponse({ error: 'DeepSeek API key is not configured.' }, 500);
  }

  let payload: { messages?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload.' }, 400);
  }

  const messages = sanitizeMessages(payload.messages);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');

  if (!latestUserMessage) {
    return jsonResponse({ error: 'No user message provided.' }, 400);
  }

  const kb = searchEmbeddedKb(latestUserMessage.content);
  const tavily = await searchTavily(latestUserMessage.content, env.TAVILY_API_KEY);
  const sources = mergeSources(kb.sources, tavily.sources, fallbackSources(latestUserMessage.content));
  const systemPrompt = `${SITE_CONTEXT}${kb.context}${tavily.context}`;

  const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL || 'deepseek-chat',
      stream: true,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!deepseekResponse.ok || !deepseekResponse.body) {
    const errorText = await deepseekResponse.text().catch(() => 'DeepSeek request failed.');
    return jsonResponse({ error: errorText.slice(0, 500) }, deepseekResponse.status || 502);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      if (sources.length > 0) {
        controller.enqueue(encoder.encode(sourceFrame(sources)));
      }

      const reader = deepseekResponse.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      ...CORS_HEADERS,
    },
  });
}
