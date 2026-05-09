# 🏗️ Arquitectura Técnica

Echoes of Lumora utiliza una arquitectura moderna de Next.js optimizada para el rendimiento y la escalabilidad.

## 🛠️ Stack Técnico Detallado

- **Framework**: [Next.js 16](https://nextjs.org/) con App Router y Turbopack para compilación ultrarrápida.
- **ORM**: [Prisma 6](https://www.prisma.io/) para una gestión de base de datos tipada y segura.
- **Estado Global**: [Zustand](https://github.com/pmndrs/zustand). Se utiliza para sincronizar datos del jugador entre componentes sin necesidad de refrescos de página.
- **Animaciones**: [Framer Motion 12](https://www.framer.com/motion/). Implementación de micro-interacciones y transiciones de UI premium.
- **Base de Datos**: PostgreSQL (recomendado) para producción, compatible con cualquier DB relacional.

## 🗄️ Modelo de Datos (Prisma)

El esquema de la base de datos se centra en la relación entre el `User` y su `PlayerProfile`:
- **PlayerProfile**: Contiene niveles, monedas y estadísticas.
- **Sanctuary**: Relacionado 1:1 con el perfil, maneja producción pasiva y escudos.
- **PlayerSpirit**: Inventario de espíritus del jugador.
- **Daily/WeeklyChallenge**: Sistema de misiones dinámicas vinculadas por fecha y número de semana.
- **Transaction/RaidLog**: Registro histórico para auditoría económica y social.

## 🛡️ Resiliencia y Seguridad

### Blindaje de APIs
Las acciones críticas (como los giros o los saqueos) están protegidas mediante:
- **Transacciones de DB**: Aseguran que el descuento de recursos y la entrega de premios ocurran simultáneamente o no ocurran (atomicidad).
- **Aislamiento de Lógica**: El sistema de misiones (`updateChallengeProgress`) está envuelto en bloques `try-catch` independientes. Si el registro de una misión falla, el juego principal (el giro) continúa sin errores 500.
- **Acceso Dinámico a Modelos**: Se utiliza acceso dinámico al cliente de Prisma en entornos de desarrollo para evitar fallos por desincronización de tipos durante el Hot Module Replacement (HMR).

## 🔊 Sistema de Audio
Implementado mediante un servicio Singleton (`audioService.ts`) que gestiona:
- Pool de sonidos para acciones rápidas.
- Música ambiental con transiciones suaves.
- Gestión de permisos del navegador (user interaction first).

## 🌍 Internacionalización
Soportado mediante `next-intl` con soporte nativo para Español e Inglés, configurable por sub-rutas (`/es`, `/en`).
