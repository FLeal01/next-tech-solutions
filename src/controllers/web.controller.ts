import type { Request, Response } from 'express';

import { autenticarUsuario, registrarUsuario, validarClave } from './auth.controller';
import { ESTADOS, proyectoModel, type ProyectoConAutor, type ProyectoInput, type EstadoProyecto } from '../models/proyecto.model';

function parseForm(body: Record<string, unknown>, userId: number): ProyectoInput | string {
  const { nombre, fecha_inicio, estado, responsable, monto } = body;
  if (typeof nombre !== 'string' || nombre.trim() === '') return 'Nombre es obligatorio';
  if (typeof responsable !== 'string' || responsable.trim() === '') return 'Responsable es obligatorio';
  const fecha = new Date(String(fecha_inicio));
  if (Number.isNaN(fecha.getTime())) return 'Fecha de inicio inválida';
  if (!ESTADOS.includes(estado as EstadoProyecto)) return 'Estado inválido';
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum < 0) return 'Monto debe ser un número >= 0';
  return {
    nombre: nombre.trim(),
    fecha_inicio: fecha,
    estado: estado as EstadoProyecto,
    responsable: responsable.trim(),
    monto: montoNum,
    created_by: userId,
  };
}

const conError = (path: string, mensaje: string) => `${path}?error=${encodeURIComponent(mensaje)}`;

// Devuelve el proyecto solo si existe y pertenece al usuario de la sesión; si no, responde (404 o redirect con error) y retorna null.
async function obtenerProyectoPropio(req: Request, res: Response): Promise<ProyectoConAutor | null> {
  const proyecto = await proyectoModel.obtenerPorId(Number(req.params.id));
  if (!proyecto) {
    res.status(404).render('404', { title: 'No encontrado' });
    return null;
  }
  if (proyecto.created_by !== req.usuario!.id) {
    res.redirect(conError('/proyectos', 'No tienes permiso para modificar este proyecto'));
    return null;
  }
  return proyecto;
}

export async function vistaListarProyectos(req: Request, res: Response): Promise<void> {
  res.render('proyectos/index', { title: 'Proyectos', proyectos: await proyectoModel.obtenerTodos(), error: req.query.error });
}

export async function vistaDetalleProyecto(req: Request, res: Response): Promise<void> {
  const proyecto = await proyectoModel.obtenerPorId(Number(req.params.id));
  if (!proyecto) {
    res.status(404).render('404', { title: 'No encontrado' });
    return;
  }
  res.render('proyectos/detalle', { title: proyecto.nombre, proyecto });
}

export function vistaCrearProyecto(req: Request, res: Response): void {
  res.render('proyectos/nuevo', { title: 'Nuevo proyecto', estados: ESTADOS, error: req.query.error });
}

export async function procesarCrearProyecto(req: Request, res: Response): Promise<void> {
  const input = parseForm(req.body, req.usuario!.id);
  if (typeof input === 'string') {
    res.redirect(conError('/proyectos/nuevo', input));
    return;
  }
  const proyecto = await proyectoModel.crear(input);
  res.redirect(`/proyectos/${proyecto.id}`);
}

export async function vistaEditarProyecto(req: Request, res: Response): Promise<void> {
  const proyecto = await obtenerProyectoPropio(req, res);
  if (!proyecto) return;
  res.render('proyectos/editar', { title: `Editar: ${proyecto.nombre}`, proyecto, estados: ESTADOS, error: req.query.error });
}

export async function procesarEditarProyecto(req: Request, res: Response): Promise<void> {
  const proyecto = await obtenerProyectoPropio(req, res);
  if (!proyecto) return;
  const id = proyecto.id;
  const input = parseForm(req.body, req.usuario!.id);
  if (typeof input === 'string') {
    res.redirect(conError(`/proyectos/${id}/editar`, input));
    return;
  }
  if (!(await proyectoModel.actualizar(id, input))) {
    res.status(404).render('404', { title: 'No encontrado' });
    return;
  }
  res.redirect(`/proyectos/${id}`);
}

export async function vistaConfirmarEliminar(req: Request, res: Response): Promise<void> {
  const proyecto = await obtenerProyectoPropio(req, res);
  if (!proyecto) return;
  res.render('proyectos/eliminar', { title: `Eliminar: ${proyecto.nombre}`, proyecto, error: req.query.error });
}

export async function procesarEliminarProyecto(req: Request, res: Response): Promise<void> {
  const proyecto = await obtenerProyectoPropio(req, res);
  if (!proyecto) return;
  if (!(await proyectoModel.eliminar(proyecto.id))) {
    res.redirect(conError(`/proyectos/${proyecto.id}/eliminar`, 'No se pudo eliminar el proyecto'));
    return;
  }
  res.redirect('/proyectos');
}

export function vistaRegistro(req: Request, res: Response): void {
  res.render('auth/registro', { title: 'Registro', error: req.query.error });
}

export async function procesarRegistro(req: Request, res: Response): Promise<void> {
  const { nombre, correo, clave } = req.body ?? {};
  const valores = { nombre: String(nombre ?? ''), correo: String(correo ?? '') };
  const errorClave = validarClave(String(clave ?? ''));
  if (errorClave) {
    res.status(400).render('auth/registro', { title: 'Registro', valores, errorClave });
    return;
  }
  const resultado = await registrarUsuario(valores.nombre, valores.correo, String(clave ?? ''));
  if (typeof resultado === 'string') {
    res.status(400).render('auth/registro', { title: 'Registro', valores, error: resultado });
    return;
  }
  res.redirect('/login');
}

export function vistaLogin(req: Request, res: Response): void {
  res.render('auth/login', { title: 'Iniciar sesión', error: req.query.error });
}

export async function procesarLogin(req: Request, res: Response): Promise<void> {
  const { correo, clave } = req.body ?? {};
  const token = await autenticarUsuario(String(correo ?? ''), String(clave ?? ''));
  if (!token) {
    res.redirect(conError('/login', 'Credenciales inválidas'));
    return;
  }
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.redirect('/proyectos');
}

export function logoutWeb(_req: Request, res: Response): void {
  res.clearCookie('token');
  res.redirect('/');
}
