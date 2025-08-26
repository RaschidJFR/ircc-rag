import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock before importing the module under test so the import is intercepted.
vi.mock('lib/rag', () => ({
  ask: vi.fn(() => ({ answer: [] })),
  closeConnection: vi.fn(),
}));

import { POST } from 'app/api/ask/route';
import * as rag from 'lib/rag';
import { NextRequest } from 'next/server';

function makeReq(body: any): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as any;
}

const LONG = 'a'.repeat(1501);
const OK = 'ok';

describe('POST /api/ask', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 400 when question is missing', async () => {
    const req = makeReq({ history: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(rag.ask).not.toHaveBeenCalled();
  });

  it('returns 400 when format is invalid', async () => {
    const req = makeReq({ question: OK, history: [], format: 'invalid' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(rag.ask).not.toHaveBeenCalled();
  });

  it('returns 500 when question exceeds CHAR_LIMIT', async () => {
    const req = makeReq({ question: LONG, history: [] });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(rag.ask).not.toHaveBeenCalled();
  });

  it('returns 500 when any history item exceeds CHAR_LIMIT', async () => {
    const req = makeReq({ question: OK, history: [OK, LONG] });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(rag.ask).not.toHaveBeenCalled();
  });

  it('returns 200 with json format when inputs are valid', async () => {
    const question = 'How are you?';
    const history = ['prev'];
    const req = makeReq({ question, history, format: 'json' });

    const res = await POST(req);
    expect(res.status).toBe(200);
    
    const responseData = await res.json();
    expect(responseData).toHaveProperty('content');

    expect(rag.ask).toHaveBeenCalledTimes(1);
    expect(rag.ask).toHaveBeenCalledWith(question, history);
  });

  it('returns 200 with markdown format when requested', async () => {
    const question = 'How are you?';
    const history = ['prev'];
    const req = makeReq({ question, history, format: 'markdown' });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/plain');
    
    const responseText = await res.text();
    expect(typeof responseText).toBe('string');

    expect(rag.ask).toHaveBeenCalledTimes(1);
    expect(rag.ask).toHaveBeenCalledWith(question, history);
  });

  it('defaults to json format when format not specified', async () => {
    const question = 'How are you?';
    const history = ['prev'];
    const req = makeReq({ question, history });

    const res = await POST(req);
    expect(res.status).toBe(200);
    
    const responseData = await res.json();
    expect(responseData).toHaveProperty('content');

    expect(rag.ask).toHaveBeenCalledTimes(1);
    expect(rag.ask).toHaveBeenCalledWith(question, history);
  });

  it('returns 400 when rag.ask returns an error', async () => {
    vi.mocked(rag.ask).mockResolvedValueOnce({ error: 'RAG error' });
    
    const question = 'How are you?';
    const history = ['prev'];
    const req = makeReq({ question, history });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('always calls closeConnection', async () => {
    const question = 'How are you?';
    const history = ['prev'];
    const req = makeReq({ question, history });

    await POST(req);
    expect(rag.closeConnection).toHaveBeenCalledTimes(1);
  });
});
