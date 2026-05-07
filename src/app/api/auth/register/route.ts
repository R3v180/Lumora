import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, displayName } = body;

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Email, contraseña y nombre son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    if (displayName.length < 2 || displayName.length > 20) {
      return NextResponse.json(
        { error: 'El nombre debe tener entre 2 y 20 caracteres' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este email' },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user + player profile + sanctuary in a transaction
    const user = await db.user.create({
      data: {
        email,
        name: displayName,
        passwordHash,
        onboardingCompleted: false,
        playerProfile: {
          create: {
            displayName,
            lumens: 100,
            energy: 100,
            maxEnergy: 100,
            sanctuary: {
              create: {
                name: `Santuario de ${displayName}`,
              },
            },
            blessings: {
              create: {
                day: 1,
                lastClaimAt: new Date(),
              },
            },
          },
        },
      },
      include: {
        playerProfile: {
          include: {
            sanctuary: true,
          },
        },
      },
    });

    // Update world total players
    await db.worldState.upsert({
      where: { id: 'lumora_world' },
      update: { totalPlayers: { increment: 1 } },
      create: { id: 'lumora_world', totalPlayers: 1 },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.playerProfile?.displayName,
      message: 'Cuenta creada exitosamente',
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Error al crear la cuenta. Inténtalo de nuevo.' },
      { status: 500 }
    );
  }
}
