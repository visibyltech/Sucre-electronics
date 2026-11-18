import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase } from './server/db.js';

initDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sucre-electronics-warri-jwt-secret-key-2026';

// Configure Cloudinary only when server-side credentials are supplied
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);
if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

interface AuthUser {
  id: number;
  email: string;
  role: 'customer' | 'admin';
  full_name: string;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

function signToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: '14d',
  });
}

function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const row = db
        .prepare('SELECT id, email, role, full_name FROM users WHERE id = ?')
        .get(decoded.id) as AuthUser | undefined;
      if (row) req.user = row;
    } catch {
      // ignore invalid optional token
    }
  }
  next();
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const row = db
      .prepare('SELECT id, email, role, full_name FROM users WHERE id = ?')
      .get(decoded.id) as AuthUser | undefined;
    if (!row) {
      res.status(401).json({ error: 'Account session no longer valid.' });
      return;
    }
    req.user = row;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Administrator privileges required.' });
      return;
    }
    next();
  });
}

// Multer setup for receipt and product image uploads
const allowedUploadMimes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedUploadMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WebP, or PDF files up to 5MB are allowed.'));
    }
  },
});

async function persistUploadedFile(
  file: Express.Multer.File,
  folder: 'receipts' | 'products'
): Promise<string> {
  if (hasCloudinary) {
    const b64 = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `sucre_electronics/${folder}`,
      resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
    });
    return result.secure_url;
  }

  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  };
  const ext = extMap[file.mimetype] || '.bin';
  const filename = `${folder}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const targetDir = path.join(process.cwd(), 'uploads', folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(path.join(targetDir, filename), file.buffer);
  return `/uploads/${folder}/${filename}`;
}

function serializeProduct(row: any) {
  if (!row) return null;
  let specifications: Record<string, string> = {};
  let images: string[] = [];
  try {
    specifications = JSON.parse(row.specifications_json || '{}');
  } catch {
    specifications = {};
  }
  try {
    images = JSON.parse(row.images_json || '[]');
  } catch {
    images = [];
  }
  const effectivePrice = row.discount_price && row.discount_price > 0 ? row.discount_price : row.price;
  const availability =
    row.stock <= 0 ? 'Out of Stock' : row.stock <= 4 ? `Low Stock (${row.stock} left)` : 'In Stock';

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    categoryId: row.category_id,
    categoryName: row.category_name || '',
    categorySlug: row.category_slug || '',
    brand: row.brand,
    price: row.price,
    discountPrice: row.discount_price,
    effectivePrice,
    stock: row.stock,
    availability,
    description: row.description,
    specifications,
    images,
    isFeatured: Boolean(row.is_featured),
    isBestSeller: Boolean(row.is_best_seller),
    isNewArrival: Boolean(row.is_new_arrival),
    isSpecialDeal: Boolean(row.is_special_deal),
    bnplEligible: Boolean(row.bnpl_eligible),
    createdAt: row.created_at,
  };
}

function generateRef(prefix: string): string {
  const num = crypto.randomInt(1000, 9999);
  const tail = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${num}-${tail}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ---------------- AUTH ROUTES ----------------

app.post('/api/auth/register', (req, res) => {
  try {
    const { fullName, email, phone, address, password } = req.body;
    if (!fullName?.trim() || !email?.trim() || !phone?.trim() || !password) {
      res.status(400).json({ error: 'Full name, email, phone number, and password are required.' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    const hash = bcrypt.hashSync(String(password), 10);
    const info = db
      .prepare(
        `INSERT INTO users (full_name, email, phone, address, password_hash, role)
         VALUES (?, ?, ?, ?, ?, 'customer')`
      )
      .run(
        String(fullName).trim(),
        normalizedEmail,
        String(phone).trim(),
        String(address || '').trim(),
        hash
      );

    const user: AuthUser = {
      id: Number(info.lastInsertRowid),
      email: normalizedEmail,
      role: 'customer',
      full_name: String(fullName).trim(),
    };
    const token = signToken(user);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: String(phone).trim(),
        address: String(address || '').trim(),
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Unable to create account right now.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;
    if (!row || !bcrypt.compareSync(String(password), row.password_hash)) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }

    const token = signToken({
      id: row.id,
      email: row.email,
      role: row.role,
      full_name: row.full_name,
    });

    res.json({
      token,
      user: {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        role: row.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Unable to sign in.' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  const row = db
    .prepare('SELECT id, full_name, email, phone, address, role, created_at FROM users WHERE id = ?')
    .get(req.user!.id) as any;
  res.json({
    user: {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      role: row.role,
      createdAt: row.created_at,
    },
  });
});

app.put('/api/auth/profile', requireAuth, (req: AuthRequest, res) => {
  const { fullName, phone, address } = req.body;
  if (!fullName?.trim() || !phone?.trim()) {
    res.status(400).json({ error: 'Full name and phone number are required.' });
    return;
  }
  db.prepare('UPDATE users SET full_name = ?, phone = ?, address = ? WHERE id = ?').run(
    String(fullName).trim(),
    String(phone).trim(),
    String(address || '').trim(),
    req.user!.id
  );
  res.json({
    user: {
      id: req.user!.id,
      fullName: String(fullName).trim(),
      email: req.user!.email,
      phone: String(phone).trim(),
      address: String(address || '').trim(),
      role: req.user!.role,
    },
  });
});

// ---------------- PUBLIC CATALOG ROUTES ----------------

app.get('/api/categories', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.display_order ASC, c.name ASC`
    )
    .all();
  res.json({ categories: rows });
});

app.get('/api/products', (req, res) => {
  const {
    category,
    search,
    featured,
    best_seller,
    new_arrival,
    special_deal,
    bnpl,
    sort,
  } = req.query;

  const conditions: string[] = [];
  const params: any[] = [];

  if (category && category !== 'all') {
    conditions.push('c.slug = ?');
    params.push(String(category));
  }
  if (featured === '1') conditions.push('p.is_featured = 1');
  if (best_seller === '1') conditions.push('p.is_best_seller = 1');
  if (new_arrival === '1') conditions.push('p.is_new_arrival = 1');
  if (special_deal === '1') conditions.push('(p.is_special_deal = 1 OR p.discount_price IS NOT NULL)');
  if (bnpl === '1') conditions.push('p.bnpl_eligible = 1');

  if (search && String(search).trim()) {
    const q = `%${String(search).trim().toLowerCase()}%`;
    conditions.push(
      '(LOWER(p.name) LIKE ? OR LOWER(p.brand) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(p.description) LIKE ?)'
    );
    params.push(q, q, q, q);
  }

  let orderClause = 'p.id DESC';
  if (sort === 'price_asc') orderClause = 'COALESCE(p.discount_price, p.price) ASC';
  else if (sort === 'price_desc') orderClause = 'COALESCE(p.discount_price, p.price) DESC';
  else if (sort === 'newest') orderClause = 'p.created_at DESC, p.id DESC';

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ${where}
    ORDER BY ${orderClause}
  `;

  const rows = db.prepare(sql).all(...params);
  res.json({ products: rows.map(serializeProduct) });
});

app.get('/api/products/:slug', (req, res) => {
  const row = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ?`
    )
    .get(req.params.slug) as any;

  if (!row) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const related = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.category_id = ? AND p.id != ?
       ORDER BY p.is_featured DESC, p.id DESC
       LIMIT 6`
    )
    .all(row.category_id, row.id);

  res.json({
    product: serializeProduct(row),
    related: related.map(serializeProduct),
  });
});

// ---------------- STORE & PAYMENT CONFIG ----------------

app.get('/api/config/payment', (_req, res) => {
  res.json({
    business: {
      name: 'SUCRE ELECTRONICS',
      location: 'Warri, Delta State, Nigeria',
      phone: '08160935332',
      whatsapp: '2348160935332',
      email: 'sucre4888@gmail.com',
    },
    bankAccounts: [
      {
        id: 'union',
        bankName: 'Union Bank',
        accountName: 'SUCRE ELECTRONICS',
        accountNumber: '0180490612',
      },
      {
        id: 'zenith',
        bankName: 'Zenith Bank',
        accountName: 'SUCRE ELECTRONICS',
        accountNumber: '1016639318',
      },
    ],
    deliveryRates: {
      warriPickup: 0,
      warriDelivery: 5000,
      deltaStateDelivery: 10000,
      freeDeliveryThreshold: 800000,
    },
    credibly: {
      provider: 'Credibly',
      configured: Boolean(process.env.CREDIBLY_API_KEY && process.env.CREDIBLY_MERCHANT_ID),
    },
    cloudinaryConfigured: hasCloudinary,
  });
});

// ---------------- ORDERS & CHECKOUT ----------------

app.post('/api/orders', optionalAuth, (req: AuthRequest, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      deliveryMethod = 'delivery',
      bankSelected,
      items,
      notes = '',
    } = req.body;

    if (!customerName?.trim() || !customerPhone?.trim() || !customerEmail?.trim()) {
      res.status(400).json({ error: 'Full name, phone number, and email are required.' });
      return;
    }
    if (deliveryMethod === 'delivery' && !deliveryAddress?.trim()) {
      res.status(400).json({ error: 'Delivery address is required for home delivery.' });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Your cart is empty.' });
      return;
    }

    const verifiedItems: any[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId) as any;
      if (!product) {
        res.status(404).json({ error: `Product #${item.productId} no longer exists.` });
        return;
      }
      const qty = Math.max(1, Math.floor(Number(item.quantity || 1)));
      if (product.stock < qty) {
        res.status(400).json({
          error: `Insufficient stock for ${product.name}. Available quantity: ${product.stock}.`,
        });
        return;
      }
      const unitPrice =
        product.discount_price && product.discount_price > 0 ? product.discount_price : product.price;
      let images: string[] = [];
      try {
        images = JSON.parse(product.images_json || '[]');
      } catch {
        images = [];
      }

      subtotal += unitPrice * qty;
      verifiedItems.push({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        unitPrice,
        quantity: qty,
        lineTotal: unitPrice * qty,
        image: images[0] || '',
      });
    }

    const deliveryFee =
      deliveryMethod === 'pickup' ? 0 : subtotal >= 800000 ? 0 : 5000;
    const totalAmount = subtotal + deliveryFee;
    const orderRef = generateRef('SUC');

    const tx = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO orders (
            order_ref, user_id, customer_name, customer_phone, customer_email,
            delivery_address, delivery_method, payment_method, bank_selected,
            items_json, subtotal, delivery_fee, total_amount, amount_paid,
            order_status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pay_now', ?, ?, ?, ?, ?, 0, 'pending_payment', ?)`
        )
        .run(
          orderRef,
          req.user?.id || null,
          String(customerName).trim(),
          String(customerPhone).trim(),
          String(customerEmail).toLowerCase().trim(),
          deliveryMethod === 'pickup'
            ? 'Showroom Pickup — Warri, Delta State'
            : String(deliveryAddress).trim(),
          deliveryMethod,
          bankSelected || 'Union Bank',
          JSON.stringify(verifiedItems),
          subtotal,
          deliveryFee,
          totalAmount,
          String(notes).trim()
        );

      for (const vi of verifiedItems) {
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(
          vi.quantity,
          vi.productId
        );
      }

      return Number(info.lastInsertRowid);
    });

    const orderId = tx();
    const created = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;

    res.status(201).json({
      order: {
        ...created,
        items: verifiedItems,
      },
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Unable to create order.' });
  }
});

app.get('/api/my/orders', requireAuth, (req: AuthRequest, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM orders
       WHERE user_id = ? OR LOWER(customer_email) = ?
       ORDER BY id DESC`
    )
    .all(req.user!.id, req.user!.email.toLowerCase()) as any[];

  const orders = rows.map((row) => {
    const receipts = db
      .prepare('SELECT * FROM payment_receipts WHERE order_id = ? ORDER BY id DESC')
      .all(row.id);
    return {
      ...row,
      items: JSON.parse(row.items_json || '[]'),
      receipts,
    };
  });
  res.json({ orders });
});

app.get('/api/orders/lookup/:orderRef', optionalAuth, (req: AuthRequest, res) => {
  const row = db
    .prepare('SELECT * FROM orders WHERE UPPER(order_ref) = UPPER(?)')
    .get(req.params.orderRef) as any;
  if (!row) {
    res.status(404).json({ error: 'Order reference not found.' });
    return;
  }
  const receipts = db
    .prepare('SELECT * FROM payment_receipts WHERE order_id = ? ORDER BY id DESC')
    .all(row.id);

  res.json({
    order: {
      ...row,
      items: JSON.parse(row.items_json || '[]'),
      receipts,
    },
  });
});

// ---------------- SAVE TO BUY (PAY SMALL SMALL) ----------------

app.post('/api/save-to-buy', optionalAuth, (req: AuthRequest, res) => {
  try {
    const {
      productId,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      initialDepositPercent = 30,
      durationMonths = 3,
      frequency = 'monthly',
    } = req.body;

    if (!productId || !customerName?.trim() || !customerPhone?.trim() || !customerEmail?.trim()) {
      res.status(400).json({ error: 'Product, full name, phone number, and email are required.' });
      return;
    }

    const depositPct = Number(initialDepositPercent);
    if (isNaN(depositPct) || depositPct < 30 || depositPct > 80) {
      res.status(400).json({ error: 'Minimum initial deposit is 30% of the product price.' });
      return;
    }

    const months = Number(durationMonths);
    if (![2, 3, 4, 6].includes(months)) {
      res.status(400).json({ error: 'Supported installment durations are 2, 3, 4, or 6 months.' });
      return;
    }

    if (frequency !== 'weekly' && frequency !== 'monthly') {
      res.status(400).json({ error: 'Payment frequency must be weekly or monthly.' });
      return;
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
    if (!product) {
      res.status(404).json({ error: 'Selected product was not found.' });
      return;
    }
    if (product.stock <= 0) {
      res.status(400).json({ error: 'This product is currently out of stock.' });
      return;
    }

    const totalPrice =
      product.discount_price && product.discount_price > 0 ? product.discount_price : product.price;
    const initialDepositAmount = Math.ceil((totalPrice * depositPct) / 100);
    const remainingAfterDeposit = totalPrice - initialDepositAmount;
    const installmentCount = frequency === 'weekly' ? months * 4 : months;
    const installmentAmount = Math.ceil(remainingAfterDeposit / installmentCount);

    let images: string[] = [];
    try {
      images = JSON.parse(product.images_json || '[]');
    } catch {
      images = [];
    }

    const now = new Date();
    const schedule = [
      {
        step: 0,
        label: `Initial Deposit (${depositPct}%)`,
        dueDate: now.toISOString().slice(0, 10),
        amount: initialDepositAmount,
        paid: false,
      },
    ];

    for (let i = 1; i <= installmentCount; i++) {
      const due = new Date(now);
      if (frequency === 'weekly') {
        due.setDate(due.getDate() + i * 7);
      } else {
        due.setMonth(due.getMonth() + i);
      }
      const isLast = i === installmentCount;
      const amt = isLast
        ? Math.max(0, remainingAfterDeposit - installmentAmount * (installmentCount - 1))
        : installmentAmount;

      schedule.push({
        step: i,
        label: `${frequency === 'weekly' ? 'Week' : 'Month'} ${i} Installment`,
        dueDate: due.toISOString().slice(0, 10),
        amount: amt,
        paid: false,
      });
    }

    const planRef = generateRef('STB');
    const info = db
      .prepare(
        `INSERT INTO save_to_buy_plans (
          plan_ref, user_id, customer_name, customer_phone, customer_email, delivery_address,
          product_id, product_name, product_image, total_price, initial_deposit_percent,
          initial_deposit_amount, duration_months, frequency, installment_count,
          installment_amount, amount_paid, outstanding_balance, status, schedule_json, release_authorized
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'awaiting_deposit', ?, 0)`
      )
      .run(
        planRef,
        req.user?.id || null,
        String(customerName).trim(),
        String(customerPhone).trim(),
        String(customerEmail).toLowerCase().trim(),
        String(deliveryAddress || '').trim(),
        product.id,
        product.name,
        images[0] || '',
        totalPrice,
        depositPct,
        initialDepositAmount,
        months,
        frequency,
        installmentCount,
        installmentAmount,
        totalPrice,
        JSON.stringify(schedule)
      );

    const created = db.prepare('SELECT * FROM save_to_buy_plans WHERE id = ?').get(info.lastInsertRowid) as any;
    res.status(201).json({
      plan: {
        ...created,
        schedule,
        receipts: [],
      },
    });
  } catch (err) {
    console.error('Create Save to Buy error:', err);
    res.status(500).json({ error: 'Unable to create Save to Buy plan.' });
  }
});

app.get('/api/my/save-to-buy', requireAuth, (req: AuthRequest, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM save_to_buy_plans
       WHERE user_id = ? OR LOWER(customer_email) = ?
       ORDER BY id DESC`
    )
    .all(req.user!.id, req.user!.email.toLowerCase()) as any[];

  const plans = rows.map((p) => {
    const receipts = db
      .prepare('SELECT * FROM payment_receipts WHERE plan_id = ? ORDER BY id DESC')
      .all(p.id);
    return {
      ...p,
      schedule: JSON.parse(p.schedule_json || '[]'),
      receipts,
    };
  });

  res.json({ plans });
});

app.get('/api/save-to-buy/lookup/:planRef', (req, res) => {
  const row = db
    .prepare('SELECT * FROM save_to_buy_plans WHERE UPPER(plan_ref) = UPPER(?)')
    .get(req.params.planRef) as any;
  if (!row) {
    res.status(404).json({ error: 'Save to Buy plan reference not found.' });
    return;
  }
  const receipts = db
    .prepare('SELECT * FROM payment_receipts WHERE plan_id = ? ORDER BY id DESC')
    .all(row.id);

  res.json({
    plan: {
      ...row,
      schedule: JSON.parse(row.schedule_json || '[]'),
      receipts,
    },
  });
});

// ---------------- RECEIPT UPLOAD & SUBMISSION ----------------

app.post('/api/receipts', optionalAuth, (req: AuthRequest, res) => {
  upload.single('receipt')(req, res, async (uploadErr: any) => {
    if (uploadErr) {
      res.status(400).json({ error: uploadErr.message || 'File upload failed.' });
      return;
    }

    try {
      const {
        reference,
        bankName,
        amountClaimed,
        senderName,
        transferDate,
        notes = '',
        customerName,
        customerEmail,
      } = req.body;

      if (!req.file) {
        res.status(400).json({ error: 'Please attach a receipt image (JPG, PNG, WebP) or PDF.' });
        return;
      }
      if (!reference?.trim() || !bankName?.trim() || !amountClaimed || !senderName?.trim()) {
        res.status(400).json({
          error: 'Order or Plan Reference, Bank Name, Amount Transferred, and Sender Name are required.',
        });
        return;
      }

      const refUpper = String(reference).trim().toUpperCase();
      const orderRow = db
        .prepare('SELECT * FROM orders WHERE UPPER(order_ref) = ?')
        .get(refUpper) as any;
      const planRow = !orderRow
        ? (db
            .prepare('SELECT * FROM save_to_buy_plans WHERE UPPER(plan_ref) = ?')
            .get(refUpper) as any)
        : null;

      if (!orderRow && !planRow) {
        res.status(404).json({
          error: `No Order or Save to Buy Plan found matching reference "${refUpper}".`,
        });
        return;
      }

      const amt = Number(amountClaimed);
      if (isNaN(amt) || amt <= 0) {
        res.status(400).json({ error: 'Please enter a valid transfer amount in Naira.' });
        return;
      }

      const fileUrl = await persistUploadedFile(req.file, 'receipts');
      const receiptRef = generateRef('RCP');
      const custName =
        String(customerName || '').trim() ||
        orderRow?.customer_name ||
        planRow?.customer_name ||
        req.user?.full_name ||
        'Customer';
      const custEmail =
        String(customerEmail || '').trim().toLowerCase() ||
        orderRow?.customer_email ||
        planRow?.customer_email ||
        req.user?.email ||
        '';

      const info = db
        .prepare(
          `INSERT INTO payment_receipts (
            receipt_ref, user_id, order_id, plan_id, order_or_plan_ref,
            customer_name, customer_email, bank_name, amount_claimed,
            sender_name, transfer_date, notes, file_url, file_name, mime_type, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review')`
        )
        .run(
          receiptRef,
          req.user?.id || orderRow?.user_id || planRow?.user_id || null,
          orderRow?.id || null,
          planRow?.id || null,
          refUpper,
          custName,
          custEmail,
          String(bankName).trim(),
          amt,
          String(senderName).trim(),
          String(transferDate || new Date().toISOString().slice(0, 10)),
          String(notes).trim(),
          fileUrl,
          req.file.originalname,
          req.file.mimetype
        );

      if (orderRow && orderRow.order_status === 'pending_payment') {
        db.prepare("UPDATE orders SET order_status = 'payment_submitted', bank_selected = ? WHERE id = ?").run(
          String(bankName).trim(),
          orderRow.id
        );
      }

      const saved = db
        .prepare('SELECT * FROM payment_receipts WHERE id = ?')
        .get(info.lastInsertRowid);
      res.status(201).json({
        receipt: saved,
        message: 'Payment receipt uploaded and queued for verification by SUCRE ELECTRONICS.',
      });
    } catch (err) {
      console.error('Receipt submission error:', err);
      res.status(500).json({ error: 'Failed to save payment receipt.' });
    }
  });
});

app.get('/api/my/receipts', requireAuth, (req: AuthRequest, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM payment_receipts
       WHERE user_id = ? OR LOWER(customer_email) = ?
       ORDER BY id DESC`
    )
    .all(req.user!.id, req.user!.email.toLowerCase());
  res.json({ receipts: rows });
});

// ---------------- CREDIBLY BNPL INTEGRATION ----------------

app.get('/api/bnpl/status', (_req, res) => {
  res.json({
    provider: 'Credibly',
    configured: Boolean(process.env.CREDIBLY_API_KEY && process.env.CREDIBLY_MERCHANT_ID),
  });
});

app.post('/api/bnpl/initiate', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      productId,
      quantity = 1,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      deliveryMethod = 'delivery',
    } = req.body;

    if (!productId || !customerName?.trim() || !customerPhone?.trim() || !customerEmail?.trim()) {
      res.status(400).json({ error: 'Product and complete customer details are required.' });
      return;
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
    if (!product) {
      res.status(404).json({ error: 'Selected product was not found.' });
      return;
    }
    if (!product.bnpl_eligible) {
      res.status(400).json({ error: 'This product is not eligible for Buy Now Pay Later.' });
      return;
    }
    const qty = Math.max(1, Math.floor(Number(quantity)));
    if (product.stock < qty) {
      res.status(400).json({ error: `Only ${product.stock} unit(s) currently in stock.` });
      return;
    }

    const unitPrice =
      product.discount_price && product.discount_price > 0 ? product.discount_price : product.price;
    const subtotal = unitPrice * qty;
    const deliveryFee = deliveryMethod === 'pickup' ? 0 : subtotal >= 800000 ? 0 : 5000;
    const totalAmount = subtotal + deliveryFee;
    let images: string[] = [];
    try {
      images = JSON.parse(product.images_json || '[]');
    } catch {
      images = [];
    }

    const orderRef = generateRef('BNPL');
    const items = [
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        unitPrice,
        quantity: qty,
        lineTotal: subtotal,
        image: images[0] || '',
      },
    ];

    const crediblyConfigured = Boolean(
      process.env.CREDIBLY_API_KEY &&
      process.env.CREDIBLY_MERCHANT_ID &&
      process.env.CREDIBLY_BASE_URL
    );

    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

    if (!crediblyConfigured) {
      const info = db
        .prepare(
          `INSERT INTO orders (
            order_ref, user_id, customer_name, customer_phone, customer_email,
            delivery_address, delivery_method, payment_method, items_json,
            subtotal, delivery_fee, total_amount, amount_paid, order_status,
            bnpl_provider, bnpl_application_id, bnpl_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'bnpl', ?, ?, ?, ?, 0, 'pending_payment', 'Credibly', NULL, 'pending_configuration')`
        )
        .run(
          orderRef,
          req.user?.id || null,
          String(customerName).trim(),
          String(customerPhone).trim(),
          String(customerEmail).toLowerCase().trim(),
          deliveryMethod === 'pickup'
            ? 'Showroom Pickup — Warri, Delta State'
            : String(deliveryAddress || '').trim(),
          deliveryMethod,
          JSON.stringify(items),
          subtotal,
          deliveryFee,
          totalAmount
        );

      const created = db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid) as any;
      res.status(201).json({
        configured: false,
        order: { ...created, items },
        message:
          'Your Credibly BNPL order application has been recorded. Live Credibly merchant API credentials are not yet activated on the server, so no loan approval has been simulated. You may switch to Pay Now or Save to Buy, or contact SUCRE ELECTRONICS on WhatsApp (08160935332).',
      });
      return;
    }

    // Real server-side Credibly API invocation using backend-only secret credentials
    const crediblyResp = await fetch(`${process.env.CREDIBLY_BASE_URL}/v1/financing/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CREDIBLY_API_KEY}`,
        'X-Merchant-Id': process.env.CREDIBLY_MERCHANT_ID!,
      },
      body: JSON.stringify({
        merchantReference: orderRef,
        amount: totalAmount,
        currency: 'NGN',
        customer: {
          name: String(customerName).trim(),
          email: String(customerEmail).toLowerCase().trim(),
          phone: String(customerPhone).trim(),
          address: String(deliveryAddress || '').trim(),
        },
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        returnUrl: `${appUrl}/api/bnpl/return?orderRef=${encodeURIComponent(orderRef)}`,
        webhookUrl: `${appUrl}/api/bnpl/webhook`,
      }),
    });

    if (!crediblyResp.ok) {
      const errBody = await crediblyResp.text();
      console.error('Credibly API error:', crediblyResp.status, errBody);
      res.status(502).json({
        error: 'Unable to initiate Credibly financing session at this moment. Please try again later.',
      });
      return;
    }

    const crediblyData = (await crediblyResp.json()) as {
      applicationId?: string;
      redirectUrl?: string;
      checkoutUrl?: string;
      status?: string;
    };

    const info = db
      .prepare(
        `INSERT INTO orders (
          order_ref, user_id, customer_name, customer_phone, customer_email,
          delivery_address, delivery_method, payment_method, items_json,
          subtotal, delivery_fee, total_amount, amount_paid, order_status,
          bnpl_provider, bnpl_application_id, bnpl_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'bnpl', ?, ?, ?, ?, 0, 'pending_payment', 'Credibly', ?, ?)`
      )
      .run(
        orderRef,
        req.user?.id || null,
        String(customerName).trim(),
        String(customerPhone).trim(),
        String(customerEmail).toLowerCase().trim(),
        deliveryMethod === 'pickup'
          ? 'Showroom Pickup — Warri, Delta State'
          : String(deliveryAddress || '').trim(),
        deliveryMethod,
        JSON.stringify(items),
        subtotal,
        deliveryFee,
        totalAmount,
        crediblyData.applicationId || null,
        crediblyData.status || 'submitted'
      );

    const created = db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid) as any;
    res.status(201).json({
      configured: true,
      order: { ...created, items },
      redirectUrl: crediblyData.redirectUrl || crediblyData.checkoutUrl || null,
    });
  } catch (err) {
    console.error('BNPL initiate error:', err);
    res.status(500).json({ error: 'Unable to process Credibly BNPL request.' });
  }
});

app.get('/api/bnpl/return', async (req, res) => {
  const orderRef = String(req.query.orderRef || '');
  const statusParam = String(req.query.status || 'pending_review');
  if (orderRef) {
    const allowedStatuses = new Set(['submitted', 'pending_review', 'approved', 'declined']);
    const safeStatus = allowedStatuses.has(statusParam) ? statusParam : 'pending_review';
    db.prepare('UPDATE orders SET bnpl_status = ? WHERE order_ref = ?').run(safeStatus, orderRef);
  }
  res.redirect(`/bnpl?orderRef=${encodeURIComponent(orderRef)}`);
});

app.post('/api/bnpl/webhook', (req, res) => {
  const secret = process.env.CREDIBLY_WEBHOOK_SECRET;
  if (secret && req.headers['x-credibly-signature'] !== secret) {
    res.status(401).json({ error: 'Invalid webhook signature.' });
    return;
  }
  const { merchantReference, status, applicationId } = req.body || {};
  if (!merchantReference || !status) {
    res.status(400).json({ error: 'Invalid webhook payload.' });
    return;
  }
  const orderStatus = status === 'approved' ? 'confirmed' : 'pending_payment';
  db.prepare(
    `UPDATE orders SET bnpl_status = ?, bnpl_application_id = COALESCE(?, bnpl_application_id), order_status = ?
     WHERE order_ref = ?`
  ).run(String(status), applicationId || null, orderStatus, String(merchantReference));
  res.json({ received: true });
});

// ---------------- CONTACT FORM ----------------

app.post('/api/contact', (req, res) => {
  const { name, email, phone = '', subject, message } = req.body;
  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    res.status(400).json({ error: 'Name, email, subject, and message are required.' });
    return;
  }
  const info = db
    .prepare(
      'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)'
    )
    .run(
      String(name).trim(),
      String(email).trim(),
      String(phone).trim(),
      String(subject).trim(),
      String(message).trim()
    );
  res.status(201).json({
    id: Number(info.lastInsertRowid),
    message: 'Thank you for contacting SUCRE ELECTRONICS. Our Warri team will reply shortly.',
  });
});

// ---------------- PROTECTED ADMIN ROUTES ----------------

app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  const totalProducts = (db.prepare('SELECT COUNT(*) as c FROM products').get() as any).c;
  const totalOrders = (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c;
  const pendingReceipts = (
    db.prepare("SELECT COUNT(*) as c FROM payment_receipts WHERE status = 'pending_review'").get() as any
  ).c;
  const activePlans = (
    db.prepare("SELECT COUNT(*) as c FROM save_to_buy_plans WHERE status IN ('awaiting_deposit', 'active')").get() as any
  ).c;
  const bnplOrders = (
    db.prepare("SELECT COUNT(*) as c FROM orders WHERE payment_method = 'bnpl'").get() as any
  ).c;
  const unreadMessages = (
    db.prepare("SELECT COUNT(*) as c FROM contact_messages WHERE status = 'unread'").get() as any
  ).c;

  res.json({
    counts: {
      totalProducts,
      totalOrders,
      pendingReceipts,
      activePlans,
      bnplOrders,
      unreadMessages,
    },
  });
});

app.post('/api/admin/products/upload-image', requireAdmin, (req, res) => {
  upload.array('images', 6)(req, res, async (err: any) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Image upload failed.' });
      return;
    }
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        res.status(400).json({ error: 'Please select at least one product image.' });
        return;
      }
      const urls: string[] = [];
      for (const file of files) {
        const url = await persistUploadedFile(file, 'products');
        urls.push(url);
      }
      res.status(201).json({ urls });
    } catch (uploadError) {
      console.error('Product image upload error:', uploadError);
      res.status(500).json({ error: 'Unable to store product images.' });
    }
  });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  try {
    const {
      name,
      categoryId,
      brand,
      price,
      discountPrice,
      stock,
      description,
      specifications,
      images,
      isFeatured,
      isBestSeller,
      isNewArrival,
      isSpecialDeal,
      bnplEligible,
    } = req.body;

    if (!name?.trim() || !categoryId || !brand?.trim() || !price || !description?.trim()) {
      res.status(400).json({ error: 'Name, category, brand, price, and description are required.' });
      return;
    }

    let slug = slugify(String(name));
    const existingSlug = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
    if (existingSlug) {
      slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    const info = db
      .prepare(
        `INSERT INTO products (
          name, slug, category_id, brand, price, discount_price, stock,
          description, specifications_json, images_json,
          is_featured, is_best_seller, is_new_arrival, is_special_deal, bnpl_eligible
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        String(name).trim(),
        slug,
        Number(categoryId),
        String(brand).trim(),
        Number(price),
        discountPrice ? Number(discountPrice) : null,
        Math.max(0, Number(stock || 0)),
        String(description).trim(),
        JSON.stringify(specifications || {}),
        JSON.stringify(Array.isArray(images) ? images : []),
        isFeatured ? 1 : 0,
        isBestSeller ? 1 : 0,
        isNewArrival ? 1 : 0,
        isSpecialDeal ? 1 : 0,
        bnplEligible !== false ? 1 : 0
      );

    const row = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`
      )
      .get(info.lastInsertRowid);
    res.status(201).json({ product: serializeProduct(row) });
  } catch (err) {
    console.error('Admin create product error:', err);
    res.status(500).json({ error: 'Unable to create product.' });
  }
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const {
      name,
      categoryId,
      brand,
      price,
      discountPrice,
      stock,
      description,
      specifications,
      images,
      isFeatured,
      isBestSeller,
      isNewArrival,
      isSpecialDeal,
      bnplEligible,
    } = req.body;

    db.prepare(
      `UPDATE products SET
        name = ?, category_id = ?, brand = ?, price = ?, discount_price = ?, stock = ?,
        description = ?, specifications_json = ?, images_json = ?,
        is_featured = ?, is_best_seller = ?, is_new_arrival = ?, is_special_deal = ?, bnpl_eligible = ?
      WHERE id = ?`
    ).run(
      String(name ?? existing.name).trim(),
      Number(categoryId ?? existing.category_id),
      String(brand ?? existing.brand).trim(),
      Number(price ?? existing.price),
      discountPrice === null || discountPrice === '' ? null : Number(discountPrice ?? existing.discount_price),
      Math.max(0, Number(stock ?? existing.stock)),
      String(description ?? existing.description).trim(),
      JSON.stringify(specifications ?? JSON.parse(existing.specifications_json || '{}')),
      JSON.stringify(images ?? JSON.parse(existing.images_json || '[]')),
      isFeatured !== undefined ? (isFeatured ? 1 : 0) : existing.is_featured,
      isBestSeller !== undefined ? (isBestSeller ? 1 : 0) : existing.is_best_seller,
      isNewArrival !== undefined ? (isNewArrival ? 1 : 0) : existing.is_new_arrival,
      isSpecialDeal !== undefined ? (isSpecialDeal ? 1 : 0) : existing.is_special_deal,
      bnplEligible !== undefined ? (bnplEligible ? 1 : 0) : existing.bnpl_eligible,
      id
    );

    const row = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`
      )
      .get(id);
    res.json({ product: serializeProduct(row) });
  } catch (err) {
    console.error('Admin update product error:', err);
    res.status(500).json({ error: 'Unable to update product.' });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const linkedPlan = db
    .prepare('SELECT id FROM save_to_buy_plans WHERE product_id = ? LIMIT 1')
    .get(id);
  if (linkedPlan) {
    res.status(400).json({
      error: 'Cannot delete a product linked to active Save to Buy records. Set stock to 0 instead.',
    });
    return;
  }
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  res.json({ deleted: true });
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const { name, description = '', image_url = '' } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }
  const slug = slugify(String(name));
  const exists = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (exists) {
    res.status(409).json({ error: 'A category with that name already exists.' });
    return;
  }
  const maxOrder = (db.prepare('SELECT MAX(display_order) as m FROM categories').get() as any).m || 0;
  const info = db
    .prepare('INSERT INTO categories (name, slug, description, image_url, display_order) VALUES (?, ?, ?, ?, ?)')
    .run(String(name).trim(), slug, String(description).trim(), String(image_url).trim(), maxOrder + 1);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ category });
});

app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }
  const { name, description } = req.body;
  db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(
    String(name ?? existing.name).trim(),
    String(description ?? existing.description).trim(),
    id
  );
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.json({ category });
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const count = (db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(id) as any).c;
  if (count > 0) {
    res.status(400).json({ error: 'Move or delete products in this category first.' });
    return;
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ deleted: true });
});

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY id DESC').all() as any[];
  const orders = rows.map((row) => ({
    ...row,
    items: JSON.parse(row.items_json || '[]'),
    receipts: db.prepare('SELECT * FROM payment_receipts WHERE order_id = ? ORDER BY id DESC').all(row.id),
  }));
  res.json({ orders });
});

app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { orderStatus, bnplStatus } = req.body;
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  db.prepare(
    'UPDATE orders SET order_status = COALESCE(?, order_status), bnpl_status = COALESCE(?, bnpl_status) WHERE id = ?'
  ).run(orderStatus || null, bnplStatus || null, id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  res.json({ order: { ...updated, items: JSON.parse(updated.items_json || '[]') } });
});

app.get('/api/admin/receipts', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM payment_receipts ORDER BY id DESC').all();
  res.json({ receipts: rows });
});

app.patch('/api/admin/receipts/:id/review', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { decision, adminNote = '' } = req.body;
  if (decision !== 'confirmed' && decision !== 'rejected') {
    res.status(400).json({ error: 'Decision must be confirmed or rejected.' });
    return;
  }

  const receipt = db.prepare('SELECT * FROM payment_receipts WHERE id = ?').get(id) as any;
  if (!receipt) {
    res.status(404).json({ error: 'Receipt not found.' });
    return;
  }

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE payment_receipts
       SET status = ?, admin_note = ?, reviewed_at = datetime('now')
       WHERE id = ?`
    ).run(decision, String(adminNote).trim(), id);

    if (decision === 'confirmed' && receipt.status !== 'confirmed') {
      if (receipt.order_id) {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(receipt.order_id) as any;
        if (order) {
          const newPaid = order.amount_paid + receipt.amount_claimed;
          const nextStatus = newPaid >= order.total_amount ? 'confirmed' : order.order_status;
          db.prepare('UPDATE orders SET amount_paid = ?, order_status = ? WHERE id = ?').run(
            newPaid,
            nextStatus,
            order.id
          );
        }
      }

      if (receipt.plan_id) {
        const plan = db
          .prepare('SELECT * FROM save_to_buy_plans WHERE id = ?')
          .get(receipt.plan_id) as any;
        if (plan) {
          const newPaid = Math.min(plan.total_price, plan.amount_paid + receipt.amount_claimed);
          const outstanding = Math.max(0, plan.total_price - newPaid);
          const schedule = JSON.parse(plan.schedule_json || '[]') as any[];
          let covered = newPaid;
          for (const step of schedule) {
            if (covered >= step.amount) {
              step.paid = true;
              covered -= step.amount;
            } else {
              step.paid = false;
            }
          }
          const completed = outstanding <= 0;
          db.prepare(
            `UPDATE save_to_buy_plans
             SET amount_paid = ?, outstanding_balance = ?, status = ?, schedule_json = ?, release_authorized = ?
             WHERE id = ?`
          ).run(
            newPaid,
            outstanding,
            completed ? 'completed' : 'active',
            JSON.stringify(schedule),
            completed ? 1 : 0,
            plan.id
          );
        }
      }
    }
  });

  tx();
  const updated = db.prepare('SELECT * FROM payment_receipts WHERE id = ?').get(id);
  res.json({ receipt: updated });
});

app.get('/api/admin/save-to-buy', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM save_to_buy_plans ORDER BY id DESC').all() as any[];
  const plans = rows.map((p) => ({
    ...p,
    schedule: JSON.parse(p.schedule_json || '[]'),
    receipts: db
      .prepare('SELECT * FROM payment_receipts WHERE plan_id = ? ORDER BY id DESC')
      .all(p.id),
  }));
  res.json({ plans });
});

app.patch('/api/admin/save-to-buy/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const plan = db.prepare('SELECT * FROM save_to_buy_plans WHERE id = ?').get(id) as any;
  if (!plan) {
    res.status(404).json({ error: 'Save to Buy plan not found.' });
    return;
  }
  const releaseAuthorized = plan.outstanding_balance <= 0 && status === 'completed' ? 1 : plan.release_authorized;
  db.prepare('UPDATE save_to_buy_plans SET status = ?, release_authorized = ? WHERE id = ?').run(
    status || plan.status,
    releaseAuthorized,
    id
  );
  res.json({ updated: true });
});

app.get('/api/admin/messages', requireAdmin, (_req, res) => {
  const messages = db.prepare('SELECT * FROM contact_messages ORDER BY id DESC').all();
  res.json({ messages });
});

app.patch('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(status || 'responded', id);
  res.json({ updated: true });
});

// ---------------- VITE / PRODUCTION STATIC SERVER ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SUCRE ELECTRONICS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
