import { Request, Response } from 'express';
import { verifyFirebaseToken, getUserById } from '../services/firebase.service';
import { generateJWT } from '../services/jwt.service';

export const loginController = async (req: Request, res: Response) => {
  try {
    const { firebaseToken } = req.body;

    // Верифікуємо токен від Google Firebase
    const decodedToken = await verifyFirebaseToken(firebaseToken);
    
    // Отримуємо інформацію про користувача
    const user = await getUserById(decodedToken.uid);

    // Генеруємо наш власний JWT токен
    const ourToken = generateJWT({
      userId: user.uid,
      email: user.email || '',
      firebaseUid: user.uid,
    });

    res.json({
      success: true,
      token: ourToken,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed',
    });
  }
};

export const registerController = async (req: Request, res: Response) => {
  try {
    const { firebaseToken } = req.body;

    // Верифікуємо токен від Google Firebase
    const decodedToken = await verifyFirebaseToken(firebaseToken);
    
    // Отримуємо інформацію про користувача
    const user = await getUserById(decodedToken.uid);

    // Генеруємо наш власний JWT токен
    const ourToken = generateJWT({
      userId: user.uid,
      email: user.email || '',
      firebaseUid: user.uid,
    });

    res.json({
      success: true,
      token: ourToken,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
      message: 'User registered successfully',
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: error.message || 'Registration failed',
    });
  }
};

export const getTokenController = async (req: Request, res: Response) => {
  try {
    const { firebaseToken } = req.body;

    // Верифікуємо токен від Google Firebase
    const decodedToken = await verifyFirebaseToken(firebaseToken);
    
    // Отримуємо інформацію про користувача
    const user = await getUserById(decodedToken.uid);

    // Генеруємо наш власний JWT токен
    const ourToken = generateJWT({
      userId: user.uid,
      email: user.email || '',
      firebaseUid: user.uid,
    });

    res.json({
      success: true,
      token: ourToken,
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: error.message || 'Token generation failed',
    });
  }
};

