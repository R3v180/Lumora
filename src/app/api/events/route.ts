import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/events - Get active and upcoming world events
export async function GET() {
  try {
    const now = new Date();

    // Get active events
    const activeEvents = await db.worldEvent.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: { endsAt: 'asc' },
    });

    // Get upcoming events (next 7 days)
    const upcomingEvents = await db.worldEvent.findMany({
      where: {
        isActive: true,
        startsAt: {
          gt: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { startsAt: 'asc' },
      take: 5,
    });

    // If no events exist, create a default rotation
    if (activeEvents.length === 0 && upcomingEvents.length === 0) {
      // Auto-generate a cycle of events
      const defaultEvents = await generateDefaultEvents(now);
      return NextResponse.json({
        active: defaultEvents.filter((e) => new Date(e.startsAt) <= now && new Date(e.endsAt) >= now),
        upcoming: defaultEvents.filter((e) => new Date(e.startsAt) > now),
      });
    }

    return NextResponse.json({
      active: activeEvents.map(formatEvent),
      upcoming: upcomingEvents.map(formatEvent),
    });
  } catch (error) {
    console.error('Events fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener eventos' },
      { status: 500 }
    );
  }
}

function formatEvent(event: any) {
  const now = new Date();
  const endsAt = new Date(event.endsAt);
  const startsAt = new Date(event.startsAt);
  const timeLeft = Math.max(0, endsAt.getTime() - now.getTime());
  const startsIn = Math.max(0, startsAt.getTime() - now.getTime());

  return {
    id: event.id,
    name: event.name,
    nameEn: event.nameEn,
    description: event.description,
    descEn: event.descEn,
    eventType: event.eventType,
    multiplier: event.multiplier,
    bonusType: event.bonusType,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    isActive: event.isActive && startsAt <= now && endsAt >= now,
    timeLeftMs: timeLeft,
    startsInMs: startsIn,
    timeLeftHours: Math.round(timeLeft / (1000 * 60 * 60) * 10) / 10,
    startsInHours: Math.round(startsIn / (1000 * 60 * 60) * 10) / 10,
  };
}

async function generateDefaultEvents(now: Date) {
  const events: any[] = [];

  // Awakening Hour: +2x lumens, lasts 2 hours
  const awakeningStart = new Date(now);
  awakeningStart.setHours(12, 0, 0, 0); // Starts at noon
  if (awakeningStart < now) {
    // Already started
    const awakeningEnd = new Date(awakeningStart);
    awakeningEnd.setHours(14, 0, 0, 0);

    const event = await db.worldEvent.upsert({
      where: { id: 'event_awakening_cycle' },
      update: { startsAt: awakeningStart, endsAt: awakeningEnd, isActive: true },
      create: {
        id: 'event_awakening_cycle',
        name: 'Hora del Despertar',
        nameEn: 'Awakening Hour',
        description: 'Los Lumens brillan con más fuerza. ¡Multiplicador x2 en todas las ganancias!',
        descEn: 'Lumens shine brighter. x2 multiplier on all earnings!',
        eventType: 'awakening',
        startsAt: awakeningStart,
        endsAt: awakeningEnd,
        multiplier: 2.0,
        bonusType: 'lumens',
        isActive: true,
      },
    });
    events.push(event);
  }

  // Stellar Eclipse: +3x rare spirits, later today
  const eclipseStart = new Date(now);
  eclipseStart.setHours(20, 0, 0, 0); // Starts at 8pm
  if (eclipseStart < now) {
    eclipseStart.setDate(eclipseStart.getDate() + 1);
  }
  const eclipseEnd = new Date(eclipseStart);
  eclipseEnd.setHours(22, 0, 0, 0);

  const eclipse = await db.worldEvent.upsert({
    where: { id: 'event_eclipse_cycle' },
    update: { startsAt: eclipseStart, endsAt: eclipseEnd, isActive: true },
    create: {
      id: 'event_eclipse_cycle',
      name: 'Eclipse Estelar',
      nameEn: 'Stellar Eclipse',
      description: 'Los espíritus raros despiertan. ¡x3 probabilidad de espíritus épicos y legendarios!',
      descEn: 'Rare spirits awaken. x3 chance for epic and legendary spirits!',
      eventType: 'eclipse',
      startsAt: eclipseStart,
      endsAt: eclipseEnd,
      multiplier: 3.0,
      bonusType: 'rare_spirits',
      isActive: true,
    },
  });
  events.push(eclipse);

  // Seasonal event: +1.5x everything, lasts 24h (weekends)
  const seasonalStart = new Date(now);
  const dayOfWeek = seasonalStart.getDay();
  // Find next Saturday
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  seasonalStart.setDate(seasonalStart.getDate() + daysUntilSaturday);
  seasonalStart.setHours(0, 0, 0, 0);
  const seasonalEnd = new Date(seasonalStart);
  seasonalEnd.setDate(seasonalEnd.getDate() + 2); // Weekend long

  const seasonal = await db.worldEvent.upsert({
    where: { id: 'event_seasonal_cycle' },
    update: { startsAt: seasonalStart, endsAt: seasonalEnd, isActive: true },
    create: {
      id: 'event_seasonal_cycle',
      name: 'Festival de Lumora',
      nameEn: 'Lumora Festival',
      description: '¡Celebra con todo Lumora! x1.5 en Lumens, energía y espíritus durante el fin de semana.',
      descEn: 'Celebrate with all of Lumora! x1.5 on Lumens, energy, and spirits during the weekend.',
      eventType: 'seasonal',
      startsAt: seasonalStart,
      endsAt: seasonalEnd,
      multiplier: 1.5,
      bonusType: 'all',
      isActive: true,
    },
  });
  events.push(seasonal);

  return events.map(formatEvent);
}
