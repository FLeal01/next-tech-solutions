import type { Request, Response } from 'express';

import { ESTADOS, proyectoModel, type EstadoProyecto, type ProyectoInput } from '../models/proyecto.model';

function parseInput(body: Record<string, unknown>, userId: number): ProyectoInput | string {
  const { nombre, fecha_inicio, estado, responsable, monto } = body;
  if (typeof nombre !== 'string' || nombre.trim() === '') return 'nombre es obligatorio';
  if (typeof responsable !== 'string' || responsable.trim() === '') return 'responsable es obligatorio';
  const fecha = new Date(String(fecha_inicio));
  if (Number.isNaN(fecha.getTime())) return 'fecha_inicio inválida';
  if (!ESTADOS.includes(estado as EstadoProyecto)) return `estado debe ser uno de: ${ESTADOS.join(', ')}`;
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum < 0) return 'monto debe ser un número >= 0';
  return {
    nombre: nombre.trim(),
    fecha_inicio: fecha,
    estado: estado as EstadoProyecto,
    responsable: responsable.trim(),
    monto: montoNum,
    created_by: userId,
  };
}

export async function listarProyectos(_req: Request, res: Response): Promise<void> {
  res.json(await proyectoModel.obtenerTodos());
}

export async function obtenerProyectoPorId(req: Request, res: Response): Promise<void> {
  const proyecto = await proyectoModel.obtenerPorId(Number(req.params.id));
  if (!proyecto) {
    res.status(404).json({ error: 'Proyecto no encontrado' });
    return;
  }
  res.json(proyecto);
}

export async function crearProyecto(req: Request, res: Response): Promise<void> {
  const input = parseInput(req.body, req.usuario!.id);
  if (typeof input === 'string') {
    res.status(400).json({ error: input });
    return;
  }
  res.status(201).json(await proyectoModel.crear(input));
}

export async function actualizarProyecto(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const existente = await proyectoModel.obtenerPorId(id);
  if (!existente) {
    res.status(404).json({ error: 'Proyecto no encontrado' });
    return;
  }
  if (existente.created_by !== req.usuario!.id) {
    res.status(403).json({ error: 'No tienes permiso para modificar este proyecto' });
    return;
  }
  const input = parseInput(req.body, req.usuario!.id);
  if (typeof input === 'string') {
    res.status(400).json({ error: input });
    return;
  }
  const proyecto = await proyectoModel.actualizar(id, input);
  if (!proyecto) {
    res.status(404).json({ error: 'Proyecto no encontrado' });
    return;
  }
  res.json(proyecto);
}

export async function eliminarProyecto(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const existente = await proyectoModel.obtenerPorId(id);
  if (!existente) {
    res.status(404).json({ error: 'Proyecto no encontrado' });
    return;
  }
  if (existente.created_by !== req.usuario!.id) {
    res.status(403).json({ error: 'No tienes permiso para eliminar este proyecto' });
    return;
  }
  if (!(await proyectoModel.eliminar(id))) {
    res.status(404).json({ error: 'Proyecto no encontrado' });
    return;
  }
  res.status(204).end();
}
