import { Router } from 'express';

import { renderHome } from '../controllers/home.controller';
import api from './api.routes';
import web from './web.routes';

const router = Router();

router.get('/', renderHome);
router.use('/api', api);
router.use(web);

export default router;
