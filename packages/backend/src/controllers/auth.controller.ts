import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { registerSchema, loginSchema } from '@gutenberg-reader/shared';
import { env } from '../config/env';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const data = registerSchema.parse(req.body);

      // Register user
      const result = await authService.register(data);

      // Set token in httpOnly cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const data = loginSchema.parse(req.body);

      // Login user
      const result = await authService.login(data);

      // Set token in httpOnly cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // Clear cookie
      res.clearCookie('token');

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await authService.getCurrentUser(req.user.userId);

      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
