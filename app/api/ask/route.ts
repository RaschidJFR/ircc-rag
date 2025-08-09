import { NextRequest, NextResponse } from 'next/server';
import * as rag from 'lib/rag';

export async function POST(request: NextRequest) {
  try {
    const { question, history } = await request.json()
    if (!question) {
      return NextResponse.json({ error: 'Invalid input: expected {question, history[]}' }, {
        status: 400,
      });
    }
    const result = await rag.ask(question, history);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /ask:', error);
    return NextResponse.json({ error: error.message || error || 'Internal server error' }, {
      status: 500,
    });
  }
}