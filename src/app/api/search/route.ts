import { NextRequest, NextResponse } from 'next/server';
import { vectorSearch, chunksToMarkdown } from 'lib/vector-search';
import { marked } from 'marked';

type FormatOptions = 'html' | 'json' | 'markdown';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('query');
    const format = (request.nextUrl.searchParams.get('format') as FormatOptions) || 'html';
    if (!query) {
      return NextResponse.json({ error: 'Expected query parameter `query`' }, { status: 400 });
    }

    const result = await vectorSearch(query);

    if (format === 'html') {
      const md = chunksToMarkdown(result);
      const body = await marked(md);
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${body}</body></html>`;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    } else if (format === 'markdown') {
      const md = chunksToMarkdown(result);
      return new NextResponse(md, {
        headers: { 'Content-Type': 'text/plain' },
      });
    } else if (format === 'json') {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: 'Invalid param `format`' }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || error || 'Internal server error' }, { status: 500 });
  }
}
