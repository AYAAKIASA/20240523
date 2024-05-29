const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const prisma = require('./prisma.util.mjs');
const authMiddleware = require('./middlewares/authMiddleware.mjs');
const userRoutes = require('./routes/users.mjs');

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
  const { email, password, confirmPassword, name } = req.body;

  if (!email || !password || !confirmPassword || !name) {
    return res.status(400).json({ message: `${!email ? "이메일" : !password ? "비밀번호" : !confirmPassword ? "비밀번호 확인" : "이름"}을 입력해 주세요.` });
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

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ message: "이미 가입 된 사용자입니다." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      email,
      name,
      role: 'APPLICANT',
      password: hashedPassword,
    },
  });

  res.status(201).json({
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    createdAt: newUser.createdAt,
    updatedAt: newUser.updatedAt,
  });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: `${!email ? "이메일" : "비밀번호"}을 입력해 주세요.` });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "이메일 형식이 올바르지 않습니다." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(400).json({ message: "인증 정보가 유효하지 않습니다." });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "인증 정보가 유효하지 않습니다." });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '12h' });

  res.status(200).json({ accessToken: token });
});

app.use('/api/users', userRoutes);

app.get('/api/me', authMiddleware, (req, res) => {
  try {
    const { id, email, name, role, createdAt, updatedAt } = req.user;

    res.status(200).json({
      id,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
