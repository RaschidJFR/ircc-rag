import { NextRequest, NextResponse } from 'next/server';
import * as rag from 'lib/rag';
import { AskApiRequestParams } from 'lib/common/types';
import { parseAnswer } from 'lib/common/tools';

const CHAR_LIMIT = 1500;

export async function POST(request: NextRequest) {
  try {
    // TODO: deprecate `question` and `history` in favor of `query[]` to align with LLM API conventions.
    const { question, history = [], format = 'json' } = (await request.json()) as AskApiRequestParams;
    if (!question) {
      return NextResponse.json({ error: 'Invalid input: expected {question, history[]}' }, { status: 400 });
    }
    if (format !== 'json' && format !== 'markdown') {
      return NextResponse.json({ error: 'Invalid parameter: format' }, { status: 400 });
    }

    checkLength(question);
    // checkLength(history);  // TODO: check messages in history
    
    const { answer, error } = await rag.ask(question, history);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    } else if (format === 'json') {
      return NextResponse.json({ content: answer }, { status: 200 });
    } else if (format === 'markdown') {
      return new NextResponse(parseAnswer(answer), { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || error || 'Internal server error' }, { status: 500 });
  } finally {
    rag.closeConnection();
  }
}

function checkLength(text: string) {
  if (text.length > CHAR_LIMIT) {
    throw new Error(`Parameter exceeds limit of ${CHAR_LIMIT} characters`);
  }
}
