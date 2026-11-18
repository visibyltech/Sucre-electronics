import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(process.cwd(), 'uploads');
const receiptsDir = path.join(uploadsDir, 'receipts');
const productsUploadDir = path.join(uploadsDir, 'products');
for (const dir of [uploadsDir, receiptsDir, productsUploadDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export const db = new Database(path.join(dataDir, 'sucre.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category_id INTEGER NOT NULL,
      brand TEXT NOT NULL,
      price REAL NOT NULL,
      discount_price REAL,
      stock INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL,
      specifications_json TEXT NOT NULL DEFAULT '{}',
      images_json TEXT NOT NULL DEFAULT '[]',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_best_seller INTEGER NOT NULL DEFAULT 0,
      is_new_arrival INTEGER NOT NULL DEFAULT 0,
      is_special_deal INTEGER NOT NULL DEFAULT 0,
      bnpl_eligible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_method TEXT NOT NULL DEFAULT 'delivery' CHECK (delivery_method IN ('delivery', 'pickup')),
      payment_method TEXT NOT NULL DEFAULT 'pay_now' CHECK (payment_method IN ('pay_now', 'save_to_buy', 'bnpl')),
      bank_selected TEXT,
      items_json TEXT NOT NULL DEFAULT '[]',
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      order_status TEXT NOT NULL DEFAULT 'pending_payment',
      bnpl_provider TEXT,
      bnpl_application_id TEXT,
      bnpl_status TEXT DEFAULT 'not_started',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS save_to_buy_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      delivery_address TEXT NOT NULL DEFAULT '',
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      product_image TEXT NOT NULL,
      total_price REAL NOT NULL,
      initial_deposit_percent INTEGER NOT NULL DEFAULT 30,
      initial_deposit_amount REAL NOT NULL,
      duration_months INTEGER NOT NULL DEFAULT 3,
      frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly')),
      installment_count INTEGER NOT NULL,
      installment_amount REAL NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      outstanding_balance REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'awaiting_deposit',
      schedule_json TEXT NOT NULL DEFAULT '[]',
      release_authorized INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS payment_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER,
      order_id INTEGER,
      plan_id INTEGER,
      order_or_plan_ref TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      amount_claimed REAL NOT NULL,
      sender_name TEXT NOT NULL,
      transfer_date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'confirmed', 'rejected')),
      admin_note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES save_to_buy_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'responded')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedAdminUser();
  seedCatalog();
}

function seedAdminUser() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'sucre4888@gmail.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'SucreAdmin@2026';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existing) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare(`
      INSERT INTO users (full_name, email, phone, address, password_hash, role)
      VALUES (?, ?, ?, ?, ?, 'admin')
    `).run(
      'SUCRE ELECTRONICS Administrator',
      adminEmail,
      '08160935332',
      'Warri, Delta State, Nigeria',
      hash
    );
  }
}

const IMG = {
  tv: '/src/assets/images/prod_qled_tv_1794993277815.jpg',
  fridge: '/src/assets/images/prod_refrigerator_1794993277897.jpg',
  freezer: '/src/assets/images/prod_chest_freezer_1794993279013.jpg',
  ac: '/src/assets/images/prod_air_conditioner_1794993279009.jpg',
  washer: '/src/assets/images/prod_washing_machine_1794993278894.jpg',
  generator: '/src/assets/images/prod_generator_1794993279565.jpg',
  sound: '/src/assets/images/prod_sound_system_1794993279759.jpg',
  kitchen: '/src/assets/images/prod_kitchen_appliances_1794993281365.jpg',
  fan: '/src/assets/images/prod_standing_fan_1794993281046.jpg',
  phone: '/src/assets/images/prod_smartphone_audio_1794993280802.jpg',
  dispenser: '/src/assets/images/prod_water_dispenser_1794993280288.jpg',
  hero: '/src/assets/images/hero_sucre_showroom_1794993276664.jpg',
};

function seedCatalog() {
  const catCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
  if (catCount > 0) return;

  const categories = [
    { name: 'Televisions', slug: 'televisions', description: '4K QLED, OLED, and Smart Android TVs from Samsung, LG, and Hisense.', image_url: IMG.tv, order: 1 },
    { name: 'Refrigerators', slug: 'refrigerators', description: 'Side-by-side and double-door inverter fridges built for Nigerian voltage.', image_url: IMG.fridge, order: 2 },
    { name: 'Freezers', slug: 'freezers', description: 'Heavy-duty chest and upright deep freezers with rapid freeze retention.', image_url: IMG.freezer, order: 3 },
    { name: 'Air Conditioners', slug: 'air-conditioners', description: 'Low-energy inverter split and standing AC units for homes and offices.', image_url: IMG.ac, order: 4 },
    { name: 'Washing Machines', slug: 'washing-machines', description: 'Front-load and twin-tub automatic washers with smart steam cycles.', image_url: IMG.washer, order: 5 },
    { name: 'Generators', slug: 'generators', description: 'Copper-coil petrol and silent inverter generators with electric key start.', image_url: IMG.generator, order: 6 },
    { name: 'Sound Systems', slug: 'sound-systems', description: 'Dolby Atmos soundbars, party towers, and home theater audio systems.', image_url: IMG.sound, order: 7 },
    { name: 'Kitchen Appliances', slug: 'kitchen-appliances', description: 'Digital microwaves, air fryers, commercial blenders, and gas cookers.', image_url: IMG.kitchen, order: 8 },
    { name: 'Fans', slug: 'fans', description: 'Rechargeable solar-ready standing fans and high-velocity cooling fans.', image_url: IMG.fan, order: 9 },
    { name: 'Phones & Accessories', slug: 'phones-accessories', description: 'Flagship smartphones, ANC wireless earbuds, and fast GaN chargers.', image_url: IMG.phone, order: 10 },
    { name: 'Other Home Appliances', slug: 'other-home-appliances', description: 'Hot & cold water dispensers, voltage stabilizers, and steam irons.', image_url: IMG.dispenser, order: 11 },
  ];

  const insertCat = db.prepare(`
    INSERT INTO categories (name, slug, description, image_url, display_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  const catIds: Record<string, number> = {};
  for (const c of categories) {
    const info = insertCat.run(c.name, c.slug, c.description, c.image_url, c.order);
    catIds[c.slug] = Number(info.lastInsertRowid);
  }

  const products = [
    {
      name: 'Samsung 65-Inch Q60D 4K QLED Smart TV',
      slug: 'samsung-65-q60d-4k-qled-smart-tv',
      cat: 'televisions',
      brand: 'Samsung',
      price: 1185000,
      discount_price: 1095000,
      stock: 7,
      desc: 'Experience pure quantum dot colour and ultra-slim AirSlim craftsmanship. Built with dual voltage protection, native Netflix, YouTube, and DSTV Stream support for crisp Nigerian living room entertainment.',
      specs: { 'Screen Size': '65 Inches', 'Resolution': '3840 x 2160 (4K UHD)', 'Panel': 'Quantum Dot QLED', 'Smart OS': 'Tizen OS with Voice Remote', 'HDMI / USB': '3x HDMI, 2x USB', 'Warranty': '2 Years Official Warranty' },
      images: [IMG.tv, IMG.hero],
      featured: 1, best: 1, arrival: 0, deal: 1, bnpl: 1,
    },
    {
      name: 'Hisense 55-Inch A6K 4K UHD Vidaa Smart TV',
      slug: 'hisense-55-a6k-4k-uhd-smart-tv',
      cat: 'televisions',
      brand: 'Hisense',
      price: 545000,
      discount_price: 498000,
      stock: 14,
      desc: 'Precision 4K upscaling with Dolby Vision HDR and DTS Virtual:X audio. Frameless cinema-grade bezel ideal for modern parlours and bedrooms.',
      specs: { 'Screen Size': '55 Inches', 'Resolution': '4K Ultra HD', 'Audio': 'DTS Virtual:X 20W', 'Connectivity': 'Dual-Band Wi-Fi & Bluetooth 5.0', 'Power': '100V-240V Wide Voltage', 'Warranty': '1 Year Warranty' },
      images: [IMG.tv, IMG.sound],
      featured: 0, best: 1, arrival: 1, deal: 1, bnpl: 1,
    },
    {
      name: 'LG 43-Inch Smart Full HD WebOS Television',
      slug: 'lg-43-smart-full-hd-webos-tv',
      cat: 'televisions',
      brand: 'LG',
      price: 365000,
      discount_price: null,
      stock: 11,
      desc: 'Reliable LG IPS viewing angles with Active HDR and ThinQ AI WebOS interface. Energy-saving panel engineered to run smoothly on small inverters or generators.',
      specs: { 'Screen Size': '43 Inches', 'Resolution': '1920 x 1080 Full HD', 'Smart Platform': 'LG WebOS', 'Power Draw': '65W Eco Mode', 'Warranty': '1 Year Warranty' },
      images: [IMG.tv],
      featured: 0, best: 0, arrival: 1, deal: 0, bnpl: 1,
    },
    {
      name: 'Haier Thermocool 518L Side-by-Side Inverter Refrigerator',
      slug: 'haier-thermocool-518l-side-by-side-refrigerator',
      cat: 'refrigerators',
      brand: 'Haier Thermocool',
      price: 1290000,
      discount_price: 1195000,
      stock: 5,
      desc: 'Brushed stainless steel twin-door inverter refrigerator featuring a built-in chilled water dispenser, multi-air flow frost-free cooling, and 100-hour cool retention after power cuts.',
      specs: { 'Net Capacity': '518 Litres', 'Compressor': 'Twin Inverter (Low Noise)', 'Cooling': 'Total No-Frost Multi-Air Flow', 'Finish': 'Anti-Fingerprint Brushed Steel', 'Dispenser': 'External Cold Water Dispenser', 'Warranty': '3 Years Compressor Warranty' },
      images: [IMG.fridge, IMG.hero],
      featured: 1, best: 1, arrival: 0, deal: 1, bnpl: 1,
    },
    {
      name: 'LG 340L Smart Inverter Double-Door Refrigerator',
      slug: 'lg-340l-smart-inverter-refrigerator',
      cat: 'refrigerators',
      brand: 'LG',
      price: 760000,
      discount_price: null,
      stock: 8,
      desc: 'DoorCooling+ technology keeps drinks cold faster while the Smart Inverter Compressor adjusts cooling power to save up to 36% energy on prepaid meters and generators.',
      specs: { 'Capacity': '340 Litres', 'Compressor': 'Smart Inverter', 'Voltage': 'Stabilizer-Free 135V-290V', 'Shelves': 'Tempered Glass (Heavy Load)', 'Warranty': '2 Years Warranty' },
      images: [IMG.fridge],
      featured: 1, best: 0, arrival: 1, deal: 0, bnpl: 1,
    },
    {
      name: 'Haier Thermocool 420L Chest Deep Freezer (HTF-420)',
      slug: 'haier-thermocool-420l-chest-deep-freezer',
      cat: 'freezers',
      brand: 'Haier Thermocool',
      price: 685000,
      discount_price: 640000,
      stock: 9,
      desc: 'Nigeria’s trusted deep freezer engineered for up to 100 hours freezing retention without power. Features anti-rust silver exterior, lockable lid, and super-freeze function.',
      specs: { 'Capacity': '420 Litres', 'Freeze Retention': 'Up to 100 Hours', 'Interior': 'Embossed Aluminium + 2 Baskets', 'Control': 'Digital Temperature Readout', 'Lock & Key': 'Included', 'Warranty': '3 Years Compressor Warranty' },
      images: [IMG.freezer],
      featured: 1, best: 1, arrival: 0, deal: 1, bnpl: 1,
    },
    {
      name: 'Scanfrost 250L Low-Noise Chest Deep Freezer',
      slug: 'scanfrost-250l-chest-deep-freezer',
      cat: 'freezers',
      brand: 'Scanfrost',
      price: 425000,
      discount_price: null,
      stock: 12,
      desc: 'Compact yet spacious 250L deep freezer built for family kitchens and small businesses. Equipped with tropicalized heavy-duty compressor and fast-freeze mode.',
      specs: { 'Capacity': '250 Litres', 'Refrigerant': 'R600a Eco-Friendly', 'Compressor': 'Tropicalized High-Efficiency', 'Mobility': 'Heavy-Duty Castor Wheels', 'Warranty': '2 Years Warranty' },
      images: [IMG.freezer],
      featured: 0, best: 1, arrival: 0, deal: 0, bnpl: 1,
    },
    {
      name: 'Hisense 1.5HP Low-Voltage Inverter Split Air Conditioner',
      slug: 'hisense-1-5hp-inverter-split-ac',
      cat: 'air-conditioners',
      brand: 'Hisense',
      price: 495000,
      discount_price: 458000,
      stock: 15,
      desc: 'Whisper-quiet 1.5HP split AC with copper condenser coils and ultra-low starting current that works comfortably with 2.5KVA+ generators and solar inverters.',
      specs: { 'Cooling Capacity': '1.5 HP (12,000 BTU)', 'Technology': 'Full DC Inverter', 'Coil Type': '100% Pure Copper Pipe & Kit Included', 'Refrigerant': 'R32 / R410A', 'Noise Level': '26 dB Quiet Mode', 'Warranty': '2 Years Warranty' },
      images: [IMG.ac],
      featured: 1, best: 1, arrival: 1, deal: 1, bnpl: 1,
    },
    {
      name: 'LG 2.0HP Dual Inverter Split Air Conditioner',
      slug: 'lg-2hp-dual-inverter-split-ac',
      cat: 'air-conditioners',
      brand: 'LG',
      price: 785000,
      discount_price: null,
      stock: 6,
      desc: 'Rapid cooling across wide living rooms with LG Dual Inverter Compressor and Watt Control energy management (40%, 60%, 80%, 100% load steps).',
      specs: { 'Cooling Capacity': '2.0 HP (18,000 BTU)', 'Compressor': 'LG Dual Inverter', 'Power Saving': 'Up to 70% Energy Savings', 'Filter': 'Dual Protection Anti-Dust Filter', 'Warranty': '10 Years Compressor Warranty' },
      images: [IMG.ac],
      featured: 0, best: 0, arrival: 1, deal: 0, bnpl: 1,
    },
    {
      name: 'LG 9KG AI Direct Drive Front-Load Washing Machine',
      slug: 'lg-9kg-front-load-washing-machine',
      cat: 'washing-machines',
      brand: 'LG',
      price: 790000,
      discount_price: 745000,
      stock: 6,
      desc: 'Dark titanium front-load washer featuring Steam+ hygiene cycles, intelligent fabric care, and silent Direct Drive motor with zero belt wear.',
      specs: { 'Wash Capacity': '9 KG', 'Spin Speed': '1400 RPM', 'Motor': 'AI Direct Drive Inverter', 'Special Cycles': 'Steam Allergy Care, 14-Min TurboWash', 'Drum': 'Stainless Steel Lifters', 'Warranty': '2 Years Warranty' },
      images: [IMG.washer],
      featured: 1, best: 1, arrival: 0, deal: 1, bnpl: 1,
    },
    {
      name: 'Hisense 8KG Automatic Front-Load Washer',
      slug: 'hisense-8kg-automatic-front-load-washer',
      cat: 'washing-machines',
      brand: 'Hisense',
      price: 495000,
      discount_price: null,
      stock: 10,
      desc: 'Sleek titanium finish 8KG front loader with snowflake drum care, child lock, and quick 15-minute daily wash cycle.',
      specs: { 'Wash Capacity': '8 KG', 'Spin Speed': '1200 RPM', 'Programs': '15 Wash Programs', 'Display': 'LED Digital Control Panel', 'Warranty': '1 Year Warranty' },
      images: [IMG.washer],
      featured: 0, best: 0, arrival: 1, deal: 0, bnpl: 1,
    },
    {
      name: 'Sumec Firman 6.5KVA Electric Key-Start Copper Generator (ECO6990ES)',
      slug: 'sumec-firman-6-5kva-key-start-generator',
      cat: 'generators',
      brand: 'Sumec Firman',
      price: 920000,
      discount_price: 865000,
      stock: 8,
      desc: '100% copper winding heavy-duty 6.5KVA petrol generator capable of powering an entire home including inverter ACs, deep freezer, TVs, and pumping machine.',
      specs: { 'Max Output': '6.5 KVA / 5.5 KW', 'Winding': '100% Copper Coil', 'Start System': 'Electric Key Start + Recoil + Battery', 'Fuel Tank': '25 Litres (Low Fuel Consumption)', 'Mobility': 'Rugged Wheel & Handle Kit', 'Warranty': '1 Year Service Warranty' },
      images: [IMG.generator],
      featured: 1, best: 1, arrival: 0, deal: 1, bnpl: 1,
    },
    {
      name: 'Elepaq 3.8KVA Key-Start Copper Petrol Generator',
      slug: 'elepaq-3-8kva-copper-generator',
      cat: 'generators',
      brand: 'Elepaq',
      price: 415000,
      discount_price: 389000,
      stock: 13,
      desc: 'Dependable 3.8KVA pure copper coil generator ideal for apartments and shops. Equipped with AVR voltage stabilization and low-oil automatic shutdown.',
      specs: { 'Rated Output': '3.5 KVA / Max 3.8 KVA', 'Coil': '100% Copper Alternator', 'Start': 'Electric Key & Recoil', 'Fuel Tank': '15 Litres', 'Warranty': '6 Months Warranty' },
      images: [IMG.generator],
      featured: 0, best: 1, arrival: 1, deal: 1, bnpl: 1,
    },
    {
      name: 'JBL Bar 500 5.1ch Dolby Atmos Soundbar & 10" Subwoofer',
      slug: 'jbl-bar-500-dolby-atmos-soundbar',
      cat: 'sound-systems',
      brand: 'JBL',
      price: 695000,
      discount_price: 645000,
      stock: 9,
      desc: 'Room-shaking 590W cinematic surround sound featuring MultiBeam technology, PureVoice dialogue clarity, and a wireless 10-inch down-firing subwoofer.',
      specs: { 'Total Output': '590W Peak Power', 'Channels': '5.1 Surround + Dolby Atmos', 'Subwoofer': '10-Inch Wireless Subwoofer', 'Streaming': 'AirPlay, Chromecast, Bluetooth, HDMI eARC', 'Warranty': '1 Year Warranty' },
      images: [IMG.sound, IMG.hero],
      featured: 1, best: 1, arrival: 1, deal: 1, bnpl: 1,
    },
    {
      name: 'LG XBOOM 1000W Home Theater Tower & Sound System',
      slug: 'lg-xboom-1000w-sound-system',
      cat: 'sound-systems',
      brand: 'LG',
      price: 440000,
      discount_price: null,
      stock: 7,
      desc: 'Built for celebrations and rich home audio with deep bass blast, dual wireless mic support, USB recording, and multi-Bluetooth pairing.',
      specs: { 'Power Output': '1000W RMS', 'Inputs': 'Optical, AUX, Dual USB, Mic In', 'Wireless': 'Bluetooth Multi-Jukebox', 'Design': 'Matte Black Acoustic Tower', 'Warranty': '1 Year Warranty' },
      images: [IMG.sound],
      featured: 0, best: 0, arrival: 1, deal: 0, bnpl: 1,
    },
    {
      name: 'Kenwood 30L Digital Microwave & 7L Air Fryer Bundle',
      slug: 'kenwood-30l-microwave-air-fryer-bundle',
      cat: 'kitchen-appliances',
      brand: 'Kenwood',
      price: 265000,
      discount_price: 238000,
      stock: 16,
      desc: 'Upgrade your kitchen with a brushed stainless steel 30L digital microwave with grill function paired with a 7L rapid-air digital fryer for oil-free crisp meals.',
      specs: { 'Microwave Capacity': '30 Litres + Grill (900W)', 'Air Fryer Capacity': '7.0 Litres Digital Touch', 'Finish': 'Brushed Stainless & Matte Black', 'Voltage': '220-240V / 50Hz', 'Warranty': '1 Year Warranty' },
      images: [IMG.kitchen],
      featured: 1, best: 1, arrival: 1, deal: 1, bnpl: 0,
    },
    {
      name: 'Binatone 18-Inch Rechargeable Solar-Ready Standing Fan',
      slug: 'binatone-18-rechargeable-standing-fan',
      cat: 'fans',
      brand: 'Binatone',
      price: 118000,
      discount_price: 105000,
      stock: 25,
      desc: 'Up to 18 hours continuous battery backup cooling with 5 aerodynamic blades, DC brushless motor, USB phone charging port, and 12V solar panel input.',
      specs: { 'Blade Size': '18 Inches (5-Blade)', 'Battery': '12V 7Ah High-Capacity Lithium/Lead Backup', 'Runtime': 'Up to 18 Hours on Low Speed', 'Extra Features': 'LED Night Light + USB Charger + Solar Input', 'Warranty': '2 Years Warranty' },
      images: [IMG.fan],
      featured: 1, best: 1, arrival: 0, deal: 1, bnpl: 0,
    },
    {
      name: 'Qasa 16-Inch Heavy-Duty Rechargeable Pedestal Fan',
      slug: 'qasa-16-rechargeable-pedestal-fan',
      cat: 'fans',
      brand: 'Qasa',
      price: 89000,
      discount_price: null,
      stock: 20,
      desc: 'Trusted Nigerian household cooling fan with automatic AC/DC switchover, silent oscillation, and remote control convenience.',
      specs: { 'Blade Size': '16 Inches', 'Speed Levels': '3 Speeds + Timer', 'Control': 'Digital Panel & Remote Control', 'Warranty': '1 Year Warranty' },
      images: [IMG.fan],
      featured: 0, best: 0, arrival: 1, deal: 0, bnpl: 0,
    },
    {
      name: 'Samsung Galaxy S24 Ultra 256GB Titanium + ANC Buds',
      slug: 'samsung-galaxy-s24-ultra-256gb-titanium',
      cat: 'phones-accessories',
      brand: 'Samsung',
      price: 1480000,
      discount_price: 1395000,
      stock: 5,
      desc: 'Factory-unlocked 5G Dual-SIM Nigerian warranty edition with 200MP quad telephoto camera, titanium frame, S-Pen, and complimentary Galaxy Buds active noise-canceling earbuds.',
      specs: { 'Storage / RAM': '256GB / 12GB RAM', 'Display': '6.8" Dynamic AMOLED 2X 120Hz', 'Camera': '200MP Main + 50MP Periscope', 'Battery': '5000mAh 45W Fast Charge', 'Included': 'Smartphone + ANC Wireless Earbuds', 'Warranty': '1 Year Official Warranty' },
      images: [IMG.phone],
      featured: 1, best: 1, arrival: 1, deal: 0, bnpl: 1,
    },
    {
      name: 'Xiaomi Redmi Note 13 Pro 256GB + Wireless Earbuds',
      slug: 'xiaomi-redmi-note-13-pro-256gb',
      cat: 'phones-accessories',
      brand: 'Xiaomi',
      price: 395000,
      discount_price: 368000,
      stock: 18,
      desc: '120Hz AMOLED flagship-feel display, 200MP OIS camera, and 67W turbo charging with wireless earbuds included in the box.',
      specs: { 'Storage / RAM': '256GB / 8GB RAM', 'Charging': '67W Turbo Charger Included', 'Display': '6.67" 120Hz AMOLED', 'Warranty': '1 Year Warranty' },
      images: [IMG.phone],
      featured: 0, best: 1, arrival: 1, deal: 1, bnpl: 1,
    },
    {
      name: 'CWAY / Haier Black & Steel Hot-Cold Water Dispenser with Cabinet',
      slug: 'haier-hot-cold-water-dispenser-cabinet',
      cat: 'other-home-appliances',
      brand: 'Haier Thermocool',
      price: 195000,
      discount_price: 178000,
      stock: 14,
      desc: 'Sleek brushed steel and matte black freestanding water dispenser featuring rapid compressor cooling, child-safe hot water lock, and a spacious lower storage cabinet.',
      specs: { 'Water Modes': 'Hot, Ambient & Ice-Cold Compressor', 'Cooling Tank': '304 Food-Grade Stainless Steel', 'Lower Compartment': '18L Hygiene Storage Cabinet', 'Safety': 'Child Hot-Water Safety Lock', 'Warranty': '1 Year Warranty' },
      images: [IMG.dispenser],
      featured: 1, best: 0, arrival: 1, deal: 1, bnpl: 0,
    },
  ];

  const insertProd = db.prepare(`
    INSERT INTO products (
      name, slug, category_id, brand, price, discount_price, stock,
      description, specifications_json, images_json,
      is_featured, is_best_seller, is_new_arrival, is_special_deal, bnpl_eligible
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of products) {
    insertProd.run(
      p.name,
      p.slug,
      catIds[p.cat],
      p.brand,
      p.price,
      p.discount_price,
      p.stock,
      p.desc,
      JSON.stringify(p.specs),
      JSON.stringify(p.images),
      p.featured,
      p.best,
      p.arrival,
      p.deal,
      p.bnpl
    );
  }
}
