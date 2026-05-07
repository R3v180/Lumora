import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'Echoes of Lumora',
    version: '0.1.0',
    status: 'running',
    phase: '0 - Initialization',
  });
}
