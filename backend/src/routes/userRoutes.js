import { Router } from 'express';
import { ROLES } from '../constants/enums.js';
import { createUser, listUsers, updateUser } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createUserSchema, updateUserSchema } from '../validations/schemas.js';

const router = Router();

router.use(authenticate, authorize(ROLES.OWNER));
router.get('/', listUsers);
router.post('/', validate(createUserSchema), createUser);
router.patch('/:id', validate(updateUserSchema), updateUser);

export default router;
