# ✨ Echoes of Lumora

![Banner](/assets/backgrounds/bg_spin_adventure.png)

**Echoes of Lumora** es un RPG incremental de fantasía construido con tecnologías web de última generación. Los jugadores exploran el mundo de Lumora, expanden sus santuarios, coleccionan espíritus elementales y compiten en arenas estratégicas.

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js 18+
- Base de datos relacional (PostgreSQL/MySQL/SQLite)

### Instalación
1. Clonar el repositorio.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno en un archivo `.env` (ver `.env.example`).
4. Preparar la base de datos:
   ```bash
   npm run db:push
   npm run db:generate
   ```
5. Poblar datos iniciales y bots:
   ```bash
   npm run seed
   npx tsx prisma/seed-bots.ts
   ```
6. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```

## 🎮 Mecánicas Principales

- **🎰 Giro Onírico**: El motor central de recursos. Gira para obtener Lumens, Energía y contribuciones elementales.
- **🏞️ Santuarios**: Gestiona tu propia isla flotante, recolecta recursos pasivos y protégete con escudos mágicos.
- **⚔️ Incursiones y Saqueos**: Asalta los santuarios de otros jugadores (o bots) para robar recursos inactivos.
- **🏆 Arena Estelar**: Compite contra otros viajeros en duelos estratégicos basados en el poder de tu colección de espíritus.
- **📅 Retos y Progresión**: Completa misiones diarias y semanales para obtener recompensas exclusivas.

## 🛠️ Stack Tecnológico

- **Frontend**: React 19 + Next.js 16 (App Router & Turbopack).
- **Estilo**: Tailwind CSS 4 + Framer Motion (Animaciones AAA).
- **Backend**: Next.js API Routes + Prisma ORM.
- **Estado**: Zustand (Sincronización en tiempo real).
- **Autenticación**: Next-Auth.
- **Internacionalización**: Next-intl.

## 📖 Documentación Detallada

- [🕹️ Guía de Gameplay](docs/GAMEPLAY.md): Mecánicas detalladas, combate y exploración.
- [💰 Economía y Progresión](docs/ECONOMY_AND_PROGRESSION.md): Sistema de monedas, tienda y misiones.
- [🏗️ Arquitectura Técnica](docs/TECHNICAL_ARCHITECTURE.md): Modelos de datos, resiliencia de APIs y stack técnico.

---
Desarrollado con ❤️ por el equipo de Echoes of Lumora.
