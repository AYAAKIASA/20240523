import jwt from 'jsonwebtoken';
import prisma from '../prisma.util.mjs';

const authMiddleware = async (req, res, next) => {
  try {
    console.log('Authorization header:', req.headers.authorization);

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: '인증 정보가 없습니다.' });
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts[0] !== 'Bearer' || tokenParts.length !== 2) {
      return res.status(401).json({ message: '지원하지 않는 인증 방식입니다.' });
    }

    const token = tokenParts[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    console.log('Decoded userId:', userId);

    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!user) {
      return res.status(401).json({ message: '인증 정보와 일치하는 사용자가 없습니다.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Error in authMiddleware:', err);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '인증 정보가 만료되었습니다.' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '인증 정보가 유효하지 않습니다.' });
    } else {
      return res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
  }
};

export default authMiddleware;
