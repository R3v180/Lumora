import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    let worldState = await db.worldState.findUnique({
      where: { id: 'lumora_world' },
    });

    if (!worldState) {
      worldState = await db.worldState.create({
        data: { id: 'lumora_world' },
      });
    }

    return NextResponse.json(worldState);
  } catch (error) {
    console.error('Failed to fetch world state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch world state' },
      { status: 500 }
    );
  }
}
