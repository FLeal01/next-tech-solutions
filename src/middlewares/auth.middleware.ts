import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config/env';

export interface TokenPayload {
  id: number;
  correo: string;
  nombre: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: TokenPayload;
      /** true si llegó un token pero era inválido o estaba expirado */
      sesionInvalida?: boolean;
    }
  }
}

type TokenResult =
  | { estado: 'ok'; usuario: TokenPayload }
  | { estado: 'ausente' }
  | { estado: 'invalido' };

function verificarToken(req: Request): TokenResult {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const token = bearer ?? req.cookies?.token;
  if (!token) return { estado: 'ausente' };
  try {
    return { estado: 'ok', usuario: jwt.verify(token, config.jwtSecret) as TokenPayload };
  } catch {
    return { estado: 'invalido' };
  }
}

/**
 * Middleware global: carga la sesión si hay un JWT válido (Bearer o cookie).
 * Nunca rechaza la solicitud; solo publica req.usuario / res.locals.usuario.
 * Si el token es inválido o expiró, limpia la cookie y marca req.sesionInvalida.
 */
export function cargarUsuario(req: Request, res: Response, next: NextFunction): void {
  const resultado = verificarToken(req);
  if (resultado.estado === 'ok') {
    req.usuario = resultado.usuario;
    res.locals.usuario = resultado.usuario;
  } else if (resultado.estado === 'invalido') {
    res.clearCookie('token');
    req.sesionInvalida = true;
  }
  next();
}

/** API: exige sesión; responde 401 JSON si no hay JWT válido. */
export function authApi(req: Request, res: Response, next: NextFunction): void {
  if (req.usuario) {
    next();
    return;
  }
  const error = req.sesionInvalida ? 'Token inválido o expirado' : 'Token no provisto o formato inválido';
  res.status(401).json({ error });
}

/** Web: exige sesión; redirige a /login si no hay JWT válido. */
export function authWeb(req: Request, res: Response, next: NextFunction): void {
  if (req.usuario) {
    next();
    return;
  }
  const mensaje = req.sesionInvalida ? 'Sesión expirada' : 'Debes iniciar sesión para continuar';
  res.redirect(`/login?error=${encodeURIComponent(mensaje)}`);
}

/** Web: solo invitados; si ya hay sesión activa, redirige a /proyectos. */
export function soloInvitado(req: Request, res: Response, next: NextFunction): void {
  if (req.usuario) {
    res.redirect('/proyectos');
    return;
  }
  next();
}
