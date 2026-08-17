import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cookieParser from 'cookie-parser';
import express from 'express';
import { engine } from 'express-handlebars';
import methodOverride from 'method-override';
import next from 'next';

import { config } from './config/env';
import { cargarUsuario } from './middlewares/auth.middleware';
import routes from './routes/index';
import { getUfDelDia } from './services/uf.service';

try {
  process.loadEnvFile();
} catch {
  // .env opcional en desarrollo
}

const dev = process.env.NODE_ENV !== 'production';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const nextApp = next({ dev, dir: root });
const nextHandler = nextApp.getRequestHandler();

async function main(): Promise<void> {
  await nextApp.prepare();

  const app = express();

  app.engine(
    'hbs',
    engine({
      extname: '.hbs',
      defaultLayout: 'main',
      layoutsDir: path.join(__dirname, 'views/layouts'),
      partialsDir: path.join(__dirname, 'views/partials'),
      helpers: {
        formatFecha: (fecha: Date | string | undefined) =>
          fecha ? new Date(fecha).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : '',
        fechaInput: (fecha: Date | string | undefined) =>
          fecha ? new Date(fecha).toISOString().slice(0, 10) : '',
        formatMonto: (monto: number) =>
          new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(monto),
        eq: (a: unknown, b: unknown) => a === b,
      },
    }),
  );
  app.set('view engine', 'hbs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(methodOverride('_method'));
  app.use('/public', express.static(path.join(root, 'public')));

  // Sesión global: publica req.usuario / res.locals.usuario en todas las rutas
  app.use(cargarUsuario);

  // Componente UF disponible en todas las vistas (partial {{> uf}})
  app.use(async (_req, res, next) => {
    res.locals.uf = await getUfDelDia();
    next();
  });

  // Rutas MVC (Express). Lo que no matchee cae en Next.
  app.use(routes);
  app.all(/(.*)/, (req, res) => nextHandler(req, res));

  app.listen(config.port, () => {
    console.log(`> Tech Solutions listo en http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
