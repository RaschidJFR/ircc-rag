import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from 'app/proxy/route';
import { NextRequest } from 'next/server';

function makeRequest(urlParam: string): NextRequest {
  // Minimal NextRequest-like object
  const url = new URL(`http://localhost/proxy?url=${encodeURIComponent(urlParam)}`);
  return { nextUrl: url } as any;
}

describe('proxy route domain allowlist', () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls: any[] = [];

  beforeEach(() => {
    fetchCalls = [];
    globalThis.fetch = (async (...args: any[]) => {
      fetchCalls.push(args);
      // Return non-HTML to skip HTML rewriting path
      return new Response('ok', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });
    }) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('allows canada.ca root domain', async () => {
    const req = makeRequest('https://canada.ca/en.html');
    const res = await GET(req);
    assert.equal(res.status, 200);
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0][0], 'https://canada.ca/en.html');
  });

  it('allows subdomains of canada.ca', async () => {
    const urls = [
      'https://www.canada.ca/',
      'https://service.canada.ca/path',
      'https://a-b.canada.ca/anything',
    ];
    for (const u of urls) {
      fetchCalls.length = 0;
      const res = await GET(makeRequest(u));
      assert.equal(res.status, 200);
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0][0], u);
    }
  });

  it('rejects domains that are not canada.ca', async () => {
    const urls = [
      'https://canada.com/',
      'https://google.ca/',
      'https://notcanada.ca/',
    ];
    for (const u of urls) {
      fetchCalls.length = 0;
      const res = await GET(makeRequest(u));
      assert.equal(res.status, 400);
      assert.equal(fetchCalls.length, 0);
    }
  });

  it('rejects hostnames that only contain canada.ca as a substring', async () => {
    const urls = [
      'https://canada.ca.evil.com/',
      'https://sub.canada.ca.bad.org/',
      'https://ilovecanada.ca/',
      'https://canada.can/',
    ];
    for (const u of urls) {
      fetchCalls.length = 0;
      const res = await GET(makeRequest(u));
      assert.equal(res.status, 400);
      assert.equal(fetchCalls.length, 0);
    }
  });
});
