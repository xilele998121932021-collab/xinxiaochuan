import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

// ✅ 声明 Edge Runtime
export const runtime = 'edge';

// ✅ 通过声明合并扩展全局 CloudflareEnv 类型
declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}

// ✅ 定义请求体类型
interface CreatePostBody {
  content?: string;
  imageUrl?: string;
  isAnonymous?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePostBody;
    const { content, imageUrl, isAnonymous } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
    }

    // ✅ 无需再传泛型，getRequestContext() 会自动识别扩展后的 CloudflareEnv
    const { env } = getRequestContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json(
        { error: '无法连接到数据库，请确保 wrangler.toml 中已配置 D1 绑定' },
        { status: 500 }
      );
    }

    const stmt = db.prepare(
      'INSERT INTO posts (content, image_url, is_anonymous) VALUES (?, ?, ?)'
    );

    const result = await stmt.bind(content, imageUrl || null, isAnonymous ?? false).run();

    return NextResponse.json({
      success: true,
      id: result.meta.last_row_id
    }, { status: 201 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('发帖失败:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}