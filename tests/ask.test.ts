import { describe, it, expect, vi, beforeEach, } from 'vitest';

// Mock before importing the module under test so the import is intercepted.
vi.mock('lib/rag.mjs', () => ({
  ask: vi.fn(() => ({})),
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

  it('returns 200 when inputs are valid', async () => {

    const question = 'How are you?';
    const history = ['prev'];
    const req = makeReq({ question, history });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(rag.ask).toHaveBeenCalledTimes(1);
    expect(rag.ask).toHaveBeenCalledWith(question, history);
  });
});
