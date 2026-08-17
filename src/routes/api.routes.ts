import { Router } from 'express';

import { login, registro } from '../controllers/auth.controller';
import {
  actualizarProyecto,
  crearProyecto,
  eliminarProyecto,
  listarProyectos,
  obtenerProyectoPorId,
} from '../controllers/proyecto.controller';
import { healthCheck } from '../controllers/health.controller';
import { authApi } from '../middlewares/auth.middleware';

const api = Router();

api.get('/health', healthCheck);

api.post('/auth/registro', registro);
api.post('/auth/login', login);

api.get('/proyectos', authApi, listarProyectos);
api.get('/proyectos/:id', authApi, obtenerProyectoPorId);
api.post('/proyectos', authApi, crearProyecto);
api.put('/proyectos/:id', authApi, actualizarProyecto);
api.delete('/proyectos/:id', authApi, eliminarProyecto);

export default api;
