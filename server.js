const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("JWT_SECRET is missing.");
  process.exit(1);
}

const db = new Database("dukaan.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    language TEXT DEFAULT 'Hindi',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity REAL DEFAULT 0,
    buy_price REAL DEFAULT 0,
    sell_price REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    total REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Login required"
    });
  }

  const token = header.substring(7);

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired login"
    });
  }
}

/* ---------------- HOME ---------------- */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Dukaan Manager Backend is running"
  });
});

/* ---------------- REGISTER ---------------- */

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, phone, password, language } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, phone and password are required"
      });
    }

    const existing = db
      .prepare("SELECT id FROM users WHERE phone = ?")
      .get(phone);

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "User already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = db
      .prepare(`
        INSERT INTO users
        (name, phone, password_hash, language)
        VALUES (?, ?, ?, ?)
      `)
      .run(
        name,
        phone,
        passwordHash,
        language || "Hindi"
      );

    const user = db
      .prepare("SELECT id, name, phone, language FROM users WHERE id = ?")
      .get(result.lastInsertRowid);

    res.json({
      success: true,
      user,
      token: createToken(user)
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
});

/* ---------------- LOGIN ---------------- */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = db
      .prepare("SELECT * FROM users WHERE phone = ?")
      .get(phone);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone or password"
      });
    }

    const correct = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!correct) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone or password"
      });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      language: user.language
    };

    res.json({
      success: true,
      user: safeUser,
      token: createToken(safeUser)
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
});

/* ---------------- CURRENT USER ---------------- */

app.get("/api/me", auth, (req, res) => {
  const user = db
    .prepare(
      "SELECT id, name, phone, language FROM users WHERE id = ?"
    )
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  res.json({
    success: true,
    user
  });
});

/* ---------------- PROFILE ---------------- */

app.put("/api/profile", auth, (req, res) => {
  const { name, language } = req.body;

  db.prepare(`
    UPDATE users
    SET name = COALESCE(?, name),
        language = COALESCE(?, language)
    WHERE id = ?
  `).run(name || null, language || null, req.user.id);

  res.json({
    success: true,
    message: "Profile updated"
  });
});

/* ---------------- ADD PRODUCT ---------------- */

app.post("/api/products", auth, (req, res) => {
  const {
    name,
    quantity = 0,
    buy_price = 0,
    sell_price = 0
  } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Product name is required"
    });
  }

  const result = db.prepare(`
    INSERT INTO products
    (user_id, name, quantity, buy_price, sell_price)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    name,
    Number(quantity),
    Number(buy_price),
    Number(sell_price)
  );

  const product = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(result.lastInsertRowid);

  res.json({
    success: true,
    product
  });
});

/* ---------------- STOCK ---------------- */

app.get("/api/stock", auth, (req, res) => {
  const products = db
    .prepare(`
      SELECT *
      FROM products
      WHERE user_id = ?
      ORDER BY name
    `)
    .all(req.user.id);

  res.json({
    success: true,
    products
  });
});

/* ---------------- SALE ---------------- */

app.post("/api/sales", auth, (req, res) => {
  const { product_id, quantity } = req.body;

  const qty = Number(quantity);

  if (!product_id || !qty || qty <= 0) {
    return res.status(400).json({
      success: false,
      message: "Product and valid quantity are required"
    });
  }

  const product = db
    .prepare(`
      SELECT *
      FROM products
      WHERE id = ? AND user_id = ?
    `)
    .get(product_id, req.user.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found"
    });
  }

  if (product.quantity < qty) {
    return res.status(400).json({
      success: false,
      message: "Not enough stock"
    });
  }

  const total = qty * product.sell_price;

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE products
      SET quantity = quantity - ?
      WHERE id = ? AND user_id = ?
    `).run(qty, product_id, req.user.id);

    db.prepare(`
      INSERT INTO sales
      (user_id, product_id, quantity, total)
      VALUES (?, ?, ?, ?)
    `).run(
      req.user.id,
      product_id,
      qty,
      total
    );
  });

  transaction();

  res.json({
    success: true,
    message: "Sale recorded",
    total
  });
});

/* ---------------- EXPENSE ---------------- */

app.post("/api/expenses", auth, (req, res) => {
  const { title, amount } = req.body;

  const value = Number(amount);

  if (!title || !value || value <= 0) {
    return res.status(400).json({
      success: false,
      message: "Title and valid amount are required"
    });
  }

  const result = db.prepare(`
    INSERT INTO expenses
    (user_id, title, amount)
    VALUES (?, ?, ?)
  `).run(
    req.user.id,
    title,
    value
  );

  res.json({
    success: true,
    expense: {
      id: result.lastInsertRowid,
      title,
      amount: value
    }
  });
});

/* ---------------- DAILY REPORT ---------------- */

app.get("/api/reports/daily", auth, (req, res) => {
  const sales = db.prepare(`
    SELECT
      COALESCE(SUM(total), 0) AS revenue,
      COALESCE(SUM(quantity), 0) AS items_sold
    FROM sales
    WHERE user_id = ?
      AND date(created_at) = date('now')
  `).get(req.user.id);

  const expenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE user_id = ?
      AND date(created_at) = date('now')
  `).get(req.user.id);

  res.json({
    success: true,
    revenue: sales.revenue,
    items_sold: sales.items_sold,
    expenses: expenses.total,
    net_after_expenses:
      sales.revenue - expenses.total
  });
});

/* ---------------- AI ---------------- */

app.post("/api/ai/chat", auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required"
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "AI is not configured yet"
      });
    }

    const todaySales = db.prepare(`
      SELECT
        COALESCE(SUM(total), 0) AS revenue,
        COALESCE(SUM(quantity), 0) AS items_sold
      FROM sales
      WHERE user_id = ?
        AND date(created_at) = date('now')
    `).get(req.user.id);

    const todayExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE user_id = ?
        AND date(created_at) = date('now')
    `).get(req.user.id);

    const stockCount = db.prepare(`
      SELECT COUNT(*) AS products
      FROM products
      WHERE user_id = ?
    `).get(req.user.id);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",

      instructions: `
You are Dukaan Manager AI.

Help a shop owner understand and manage their shop.

Give practical, simple answers.
Use Indian rupees when discussing money.
Never invent business numbers.
If the available data does not contain an answer, clearly say that the data is not available.
Do not make financial guarantees.
      `,

      input: `
Shop owner's question:
${String(message).trim()}

Today's shop data:
Revenue: ₹${todaySales.revenue}
Items sold: ${todaySales.items_sold}
Expenses: ₹${todayExpenses.total}
Products in stock list: ${stockCount.products}
      `
    });

    res.json({
      success: true,
      answer: response.output_text
    });

  } catch (error) {
    console.error("AI ERROR:", error);

    res.status(500).json({
      success: false,
      message: "AI request failed"
    });
  }
});

/* ---------------- 404 ---------------- */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

/* ---------------- SERVER ---------------- */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Dukaan Manager Backend running on port ${PORT}`);
});
