import { NextRequest, NextResponse } from 'next/server';
import * as rag from 'lib/rag.mjs';

const CHAR_LIMIT = 1500;

export async function POST(request: NextRequest) {
  try {
    const { question, history } = await request.json();
    if (!question) {
      return NextResponse.json(
        { error: 'Invalid input: expected {question, history[]}' },
        {
          status: 400,
        }
      );
    }

    checkLength(question);
    checkLength(history);
    const result = await rag.ask(question, history);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /ask:', error);
    return NextResponse.json(
      { error: error.message || error || 'Internal server error' },
      {
        status: 500,
      }
    );
  } finally {
    rag.closeConnection();
  }
}

function checkLength(text: string | string[]) {
  if (Array.isArray(text)) {
    if (text.some((t) => t.length > CHAR_LIMIT)) {
      throw new Error(`One of the queries exceeds character limit of ${CHAR_LIMIT}`);
    }
  } else {
    if (text.length > CHAR_LIMIT) {
      throw new Error(`Query exceeds character limit of ${CHAR_LIMIT}`);
    }
  }
}
