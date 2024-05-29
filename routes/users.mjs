
import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.mjs';
import prisma from '../prisma.util.mjs';

const router = express.Router();

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

export default router;
