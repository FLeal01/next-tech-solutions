import type { Usuario } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

export type { Usuario };

export type NuevoUsuario = Pick<Usuario, 'nombre' | 'correo' | 'clave'>;

export type UsuarioSinClave = Omit<Usuario, 'clave'>;

export const usuarioModel = {
  crear(data: NuevoUsuario): Promise<Usuario> {
    return prisma.usuario.create({ data });
  },

  buscarPorCorreo(correo: string): Promise<Usuario | null> {
    return prisma.usuario.findUnique({ where: { correo: correo.toLowerCase() } });
  },

  buscarPorId(id: number): Promise<UsuarioSinClave | null> {
    return prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nombre: true, correo: true, created_at: true },
    });
  },
};
