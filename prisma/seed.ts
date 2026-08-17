import argon2 from 'argon2';

import { prisma } from '../src/lib/prisma';

const usuarios = await prisma.usuario.count();
if (usuarios > 0) {
  console.log('Seed omitido: ya existen usuarios.');
  process.exit(0);
}

const demo = await prisma.usuario.create({
  data: {
    nombre: 'Usuario Demo',
    correo: 'demo@test.cl',
    clave: await argon2.hash('Demo1234#'),
  },
});

await prisma.proyecto.createMany({
  data: [
    {
      nombre: 'Sitio web corporativo',
      fecha_inicio: new Date('2026-01-15'),
      estado: 'en_progreso',
      responsable: 'Ana Torres',
      monto: 4_500_000,
      created_by: demo.id,
    },
    {
      nombre: 'App móvil de inventario',
      fecha_inicio: new Date('2026-03-01'),
      estado: 'pendiente',
      responsable: 'Luis Pérez',
      monto: 8_200_000,
      created_by: demo.id,
    },
  ],
});

console.log(`Seed OK: usuario demo@test.cl / Demo1234# (id ${demo.id}) + 2 proyectos.`);
await prisma.$disconnect();
