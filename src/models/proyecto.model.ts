import type { Proyecto } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

export type { Proyecto };

const AUTOR_PUBLICO = { select: { id: true, nombre: true, correo: true, created_at: true } } as const;

export type ProyectoConAutor = Proyecto & { autor: { id: number; nombre: string; correo: string; created_at: Date } };

export type EstadoProyecto = 'pendiente' | 'en_progreso' | 'completado';

export const ESTADOS: EstadoProyecto[] = ['pendiente', 'en_progreso', 'completado'];

export type ProyectoInput = Pick<
  Proyecto,
  'nombre' | 'fecha_inicio' | 'estado' | 'responsable' | 'monto' | 'created_by'
>;

export const proyectoModel = {
  obtenerTodos(): Promise<ProyectoConAutor[]> {
    return prisma.proyecto.findMany({ include: { autor: AUTOR_PUBLICO }, orderBy: { id: 'asc' } });
  },

  obtenerPorId(id: number): Promise<ProyectoConAutor | null> {
    return prisma.proyecto.findUnique({ where: { id }, include: { autor: AUTOR_PUBLICO } });
  },

  crear(data: ProyectoInput): Promise<Proyecto> {
    return prisma.proyecto.create({ data });
  },

  async actualizar(id: number, data: ProyectoInput): Promise<Proyecto | null> {
    try {
      return await prisma.proyecto.update({ where: { id }, data });
    } catch {
      return null; // P2025: registro no existe
    }
  },

  async eliminar(id: number): Promise<boolean> {
    try {
      await prisma.proyecto.delete({ where: { id } });
      return true;
    } catch {
      return false; // P2025: registro no existe
    }
  },
};
