import argon2 from 'argon2';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config/env';
import { usuarioModel, type Usuario } from '../models/usuario.model';

export function validarClave(clave: string): string | null {
  if (clave.length < 8) return 'la clave debe tener al menos 8 caracteres';
  if (!/[a-záéíóúñ]/.test(clave)) return 'la clave debe incluir al menos una minúscula';
  if (!/[A-ZÁÉÍÓÚÑ]/.test(clave)) return 'la clave debe incluir al menos una mayúscula';
  if (!/[0-9]/.test(clave)) return 'la clave debe incluir al menos un número';
  if (!/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(clave)) return 'la clave debe incluir al menos un símbolo especial';
  return null;
}

export async function registrarUsuario(nombre: string, correo: string, clave: string): Promise<Usuario | string> {
  if (nombre.trim() === '') return 'nombre es obligatorio';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return 'correo inválido';
  const errorClave = validarClave(clave);
  if (errorClave) return errorClave;
  const correoNormalizado = correo.toLowerCase();
  if (await usuarioModel.buscarPorCorreo(correoNormalizado)) return 'el correo ya está registrado';
  return usuarioModel.crear({ nombre: nombre.trim(), correo: correoNormalizado, clave: await argon2.hash(clave) });
}

export async function autenticarUsuario(correo: string, clave: string): Promise<string | null> {
  const usuario = await usuarioModel.buscarPorCorreo(correo);
  if (!usuario || !(await argon2.verify(usuario.clave, clave))) return null;
  return jwt.sign({ id: usuario.id, correo: usuario.correo, nombre: usuario.nombre }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export async function registro(req: Request, res: Response): Promise<void> {
  const { nombre, correo, clave } = req.body ?? {};
  const resultado = await registrarUsuario(String(nombre ?? ''), String(correo ?? ''), String(clave ?? ''));
  if (typeof resultado === 'string') {
    res.status(400).json({ error: resultado });
    return;
  }
  const { clave: _clave, ...usuarioSinClave } = resultado;
  res.status(201).json(usuarioSinClave);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { correo, clave } = req.body ?? {};
  const token = await autenticarUsuario(String(correo ?? ''), String(clave ?? ''));
  if (!token) {
    res.status(401).json({ error: 'Credenciales inválidas' });
    return;
  }
  res.json({ token });
}
