import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Mark onboarding as completed in User model
    await db.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true }
    });

    // Also give a starter gift: a common spirit if they don't have any
    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { spirits: true }
    });

    if (player && player.spirits.length === 0) {
      // Find a starter spirit (e.g., Spark)
      const starterSpirit = await db.spiritType.findFirst({
        where: { id: 'spirit_fire_common_1' }
      });

      if (starterSpirit) {
        await db.playerSpirit.create({
          data: {
            playerId: player.id,
            spiritTypeId: starterSpirit.id,
            level: 1
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding update error:', error);
    return NextResponse.json({ error: 'Error al completar onboarding' }, { status: 500 });
  }
}
