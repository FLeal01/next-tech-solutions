import { Router } from 'express';

import {
  logoutWeb,
  procesarCrearProyecto,
  procesarEditarProyecto,
  procesarEliminarProyecto,
  procesarLogin,
  procesarRegistro,
  vistaConfirmarEliminar,
  vistaCrearProyecto,
  vistaDetalleProyecto,
  vistaEditarProyecto,
  vistaListarProyectos,
  vistaLogin,
  vistaRegistro,
} from '../controllers/web.controller';
import { authWeb, soloInvitado } from '../middlewares/auth.middleware';

const web = Router();

web.get('/proyectos', authWeb, vistaListarProyectos);
web.get('/proyectos/nuevo', authWeb, vistaCrearProyecto);
web.post('/proyectos', authWeb, procesarCrearProyecto);
web.get('/proyectos/:id', authWeb, vistaDetalleProyecto);
web.get('/proyectos/:id/editar', authWeb, vistaEditarProyecto);
web.put('/proyectos/:id', authWeb, procesarEditarProyecto);
web.get('/proyectos/:id/eliminar', authWeb, vistaConfirmarEliminar);
web.delete('/proyectos/:id/eliminar', authWeb, procesarEliminarProyecto);

web.get('/registro', soloInvitado, vistaRegistro);
web.post('/registro', procesarRegistro);
web.get('/login', soloInvitado, vistaLogin);
web.post('/login', procesarLogin);
web.get('/logout', logoutWeb);

export default web;
