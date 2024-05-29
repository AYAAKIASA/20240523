import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import prisma from './prisma.util.mjs';
import authMiddleware from './middlewares/authMiddleware.mjs';
import userRoutes from './routes/users.mjs';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/', async (req, res) => {
  try {
    await prisma.$connect();
    console.log('Connected to the database');
    res.send('Connected to the database');
  } catch (error) {
    console.error('Error connecting to the database:', error);
    res.status(500).send('Error connecting to the database');
  }
});

app.post('/register', async (req, res) => {
  const { email, password, confirmPassword, name, username } = req.body;

  console.log('Register request:', { email, password, confirmPassword, name, username });

  if (!email || !password || !confirmPassword || !name || !username) {
    return res.status(400).json({ message: `${!email ? "이메일" : !password ? "비밀번호" : !confirmPassword ? "비밀번호 확인" : !name ? "이름" : "사용자 이름"}을 입력해 주세요.` });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "이메일 형식이 올바르지 않습니다." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "비밀번호는 6자리 이상이어야 합니다." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "입력 한 두 비밀번호가 일치하지 않습니다." });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        role: 'APPLICANT',
        password: hashedPassword,
        name,
        username,
      },
    });

    console.log('New user created:', newUser);

    res.status(201).json({
      id: newUser.user_id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log('Login request:', { email, password });

  if (!email || !password) {
    return res.status(400).json({ message: `${!email ? "이메일" : "비밀번호"}을 입력해 주세요.` });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "인증 정보가 유효하지 않습니다." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "인증 정보가 유효하지 않습니다." });
    }

    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '12h' });  // change to user_id

    console.log('Generated token:', token);

    res.status(200).json({ accessToken: token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const { user_id, email, name, role, createdAt, updatedAt } = req.user;

    console.log('User info:', { user_id, email, name, role, createdAt, updatedAt });

    res.status(200).json({
      id: user_id,
      email,
      name,
      role,
      createdAt,
      updatedAt
    });
  } catch (error) {
    console.error('Error retrieving user information:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
