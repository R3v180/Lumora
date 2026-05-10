import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 });

    const { leaderId, materialIds } = await req.json();
    if (!leaderId || !materialIds || materialIds.length < 2) {
      return new NextResponse('Invalid merge data', { status: 400 });
    }

    const player = await db.playerProfile.findFirst({
      where: { user: { email: session.user.email } },
      include: { spirits: { include: { spiritType: true } } }
    }) as any;

    if (!player) {
      console.log('[MERGE_API] Player not found');
      return new NextResponse('Player not found', { status: 404 });
    }

    const leader = player.spirits.find(s => s.id === leaderId);
    const materials = player.spirits.filter(s => materialIds.includes(s.id));

    if (!leader || materials.length < 2) {
      console.log('[MERGE_API] Spirits missing:', { leader: !!leader, materialsFound: materials.length });
      return new NextResponse('Spirits not found', { status: 404 });
    }

    // 1. Determine new rarity (evolution)
    const currentRarity = leader.spiritType.rarity;
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const currentIndex = rarityOrder.indexOf(currentRarity);
    
    let targetSpiritTypeId = leader.spiritTypeId;
    let evolved = false;

    // Logic: If merging 3 of the same rarity, try to evolve to next rarity
    if (currentIndex < rarityOrder.length - 1) {
       // Search for the evolved version of this spirit type
       const evolvedType = await db.spiritType.findFirst({
         where: { 
           element: leader.spiritType.element,
           rarity: rarityOrder[currentIndex + 1]
         }
       });
       if (evolvedType) {
         targetSpiritTypeId = evolvedType.id;
         evolved = true;
       }
    }

    // 2. Calculate Success Probability
    const raritySuccessRates: Record<string, number> = {
      common: 0.95,
      uncommon: 0.85,
      rare: 0.65,
      epic: 0.40,
      legendary: 0.20
    };
    const successRate = raritySuccessRates[currentRarity] || 0.5;
    const roll = Math.random();
    const isSuccess = roll <= successRate;

    // 2. Execute Transaction
    const result = await db.$transaction(async (tx: any) => {
      // Always delete materials
      await tx.playerSpirit.deleteMany({
        where: { id: { in: materialIds } }
      });

      if (isSuccess) {
        // SUCCESS: Evolve and Transfer XP
        const totalXpToTransfer = materials.reduce((acc, s) => acc + (s.experience || 0), 0);
        
        const updatedSpirit = await tx.playerSpirit.update({
          where: { id: leaderId },
          data: {
            spiritTypeId: targetSpiritTypeId,
            experience: { increment: totalXpToTransfer }
          },
          include: { spiritType: true }
        });

        // Level Up logic based on New Rarity Curve
        const XP_BASE: Record<string, number> = {
          common: 50,
          uncommon: 100,
          rare: 250,
          epic: 600,
          legendary: 1500
        };
        const targetRarity = updatedSpirit.spiritType.rarity;
        const xpBaseForLevel = XP_BASE[targetRarity] || 50;
        
        let finalLevel = updatedSpirit.level;
        let finalXp = updatedSpirit.experience;
        let expNeeded = finalLevel * xpBaseForLevel;

        // If evolved, we might need to recalculate level from scratch based on total XP
        // to handle the drop in level naturally.
        if (evolved) {
           finalLevel = 1;
           expNeeded = xpBaseForLevel;
           // We keep finalXp as it is (Total XP transferred)
        }

        while (finalXp >= expNeeded && finalLevel < 100) {
          finalXp -= expNeeded;
          finalLevel++;
          expNeeded = finalLevel * xpBaseForLevel;
        }

        return await tx.playerSpirit.update({
          where: { id: leaderId },
          data: { level: finalLevel, experience: finalXp },
          include: { spiritType: true }
        });
      } else {
        // FAILURE: Keep leader but apply XP penalty (lose 20% of current XP)
        const currentXp = leader.experience || 0;
        const penalty = Math.floor(currentXp * 0.2);

        return await tx.playerSpirit.update({
          where: { id: leaderId },
          data: {
            experience: Math.max(0, currentXp - penalty) // Prevent negative XP
          },
          include: { spiritType: true }
        });
      }
    });

    return NextResponse.json({ 
      success: isSuccess, 
      evolved: isSuccess && evolved,
      spirit: result,
      roll,
      chance: successRate
    });

  } catch (error) {
    console.error('[SPIRIT_MERGE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
