import { Router } from 'express';
import { loginController, registerController, getTokenController } from '../controllers/auth.controller';
import { validateAuthRequest } from '../middleware/validateAuth';

export const authRouter = Router();

authRouter.post('/login', validateAuthRequest, loginController);
authRouter.post('/register', validateAuthRequest, registerController);
authRouter.post('/token', validateAuthRequest, getTokenController);

