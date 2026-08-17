import type { Request, Response } from 'express';

export function renderHome(_req: Request, res: Response): void {
  res.render('home', {
    title: 'Tech Solutions',
    description: 'Sistema de gestión de proyectos',
  });
}
