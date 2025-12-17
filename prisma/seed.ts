import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Seed Roles
  console.log('Seeding roles...')
  const superAdminPermissions = {
    dashboard: { view: true },
    pos: { access: true, discount: true, void: true },
    products: { view: true, create: true, edit: true, delete: true },
    categories: { view: true, create: true, edit: true, delete: true },
    purchases: { view: true, create: true, edit: true, delete: true },
    sales: { view: true, edit: true, void: true, refund: true },
    stock: { view: true, adjust: true },
    customers: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, export: true },
    settings: { view: true, edit: true, system: true },
  }

  const cashierPermissions = {
    dashboard: { view: true },
    pos: { access: true, discount: false, void: false },
    products: { view: true, create: false, edit: false, delete: false },
    categories: { view: false, create: false, edit: false, delete: false },
    purchases: { view: false, create: false, edit: false, delete: false },
    sales: { view: true, edit: false, void: false, refund: false },
    stock: { view: true, adjust: false },
    customers: { view: true, create: true, edit: false, delete: false },
    reports: { view: false, export: false },
    settings: { view: false, edit: false, system: false },
  }

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      permissions: JSON.stringify(superAdminPermissions),
      isSystem: true,
    },
  })

  const cashierRole = await prisma.role.upsert({
    where: { name: 'Cashier' },
    update: {},
    create: {
      name: 'Cashier',
      permissions: JSON.stringify(cashierPermissions),
      isSystem: true,
    },
  })

  console.log(`✅ Seeded 2 roles (Super Admin, Cashier)`)

  // Seed Units
  console.log('Seeding units...')
  const units = [
    { name: 'Piece', shortName: 'pcs' },
    { name: 'Kilogram', shortName: 'kg' },
    { name: 'Gram', shortName: 'g' },
    { name: 'Liter', shortName: 'l' },
    { name: 'Milliliter', shortName: 'ml' },
    { name: 'Box', shortName: 'box' },
    { name: 'Pack', shortName: 'pack' },
    { name: 'Bottle', shortName: 'bottle' },
    { name: 'Can', shortName: 'can' },
    { name: 'Bag', shortName: 'bag' },
  ]

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { shortName: unit.shortName },
      update: {},
      create: unit,
    })
  }
  console.log(`✅ Seeded ${units.length} units`)

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: hashedPassword, // Update password in case it changed
      status: 'ACTIVE',
      role: 'OWNER',
      roleId: superAdminRole.id, // Assign Super Admin role
    },
    create: {
      username: 'admin',
      password: hashedPassword,
      fullName: 'Administrator',
      role: 'OWNER',
      status: 'ACTIVE',
      roleId: superAdminRole.id, // Assign Super Admin role
    },
  })

  console.log('✅ Admin user created/updated:', admin.username)

  // Create categories
  const categories = [
    { name: 'Beverages', description: 'Drinks and beverages' },
    { name: 'Snacks', description: 'Chips, cookies, and snacks' },
    { name: 'Dairy', description: 'Milk, cheese, and dairy products' },
    { name: 'Fruits & Vegetables', description: 'Fresh produce' },
    { name: 'General', description: 'General category for products' },
  ]

  const createdCategories = []
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
    createdCategories.push(category)
    console.log(`✅ Category created: ${category.name}`)
  }

  // Create a system user for activity logs
  try {
    const systemUser = await prisma.user.upsert({
      where: { username: 'system' },
      update: {},
      create: {
        username: 'system',
        password: hashedPassword, // Dummy password, won't be used for login
        fullName: 'System',
        role: 'CASHIER',
        status: 'INACTIVE', // System user is inactive
      },
    })
    console.log('✅ System user created for activity logs')
  } catch (error) {
    console.log('⚠️  System user already exists or error creating it')
  }

  // Create dummy products
  const products = [
    {
      name: 'Coca Cola 500ml',
      barcode: '8801001234567',
      sku: 'BEV-001',
      description: 'Carbonated soft drink',
      categoryName: 'Beverages',
      purchasePrice: 800,
      sellingPrice: 1200,
      stock: 50,
      minStockLevel: 10,
      unit: 'bottle',
    },
    {
      name: 'Pepsi 500ml',
      barcode: '8801001234568',
      sku: 'BEV-002',
      description: 'Carbonated soft drink',
      categoryName: 'Beverages',
      purchasePrice: 800,
      sellingPrice: 1200,
      stock: 45,
      minStockLevel: 10,
      unit: 'bottle',
    },
    {
      name: 'Sprite 500ml',
      barcode: '8801001234569',
      sku: 'BEV-003',
      description: 'Lemon-lime soft drink',
      categoryName: 'Beverages',
      purchasePrice: 800,
      sellingPrice: 1200,
      stock: 30,
      minStockLevel: 10,
      unit: 'bottle',
    },
    {
      name: 'Red Bull Energy Drink',
      barcode: '8801001234570',
      sku: 'BEV-004',
      description: 'Energy drink',
      categoryName: 'Beverages',
      purchasePrice: 1500,
      sellingPrice: 2500,
      stock: 25,
      minStockLevel: 5,
      unit: 'can',
    },
    {
      name: 'Mineral Water 500ml',
      barcode: '8801001234571',
      sku: 'BEV-005',
      description: 'Purified drinking water',
      categoryName: 'Beverages',
      purchasePrice: 300,
      sellingPrice: 500,
      stock: 100,
      minStockLevel: 20,
      unit: 'bottle',
    },
    {
      name: 'Lay\'s Classic Chips',
      barcode: '8801001234572',
      sku: 'SNK-001',
      description: 'Potato chips',
      categoryName: 'Snacks',
      purchasePrice: 1200,
      sellingPrice: 2000,
      stock: 40,
      minStockLevel: 10,
      unit: 'pack',
    },
    {
      name: 'Oreo Cookies',
      barcode: '8801001234573',
      sku: 'SNK-002',
      description: 'Chocolate sandwich cookies',
      categoryName: 'Snacks',
      purchasePrice: 2500,
      sellingPrice: 4000,
      stock: 20,
      minStockLevel: 5,
      unit: 'pack',
    },
    {
      name: 'Pringles Original',
      barcode: '8801001234574',
      sku: 'SNK-003',
      description: 'Stackable potato chips',
      categoryName: 'Snacks',
      purchasePrice: 1800,
      sellingPrice: 3000,
      stock: 35,
      minStockLevel: 8,
      unit: 'can',
    },
    {
      name: 'Fresh Milk 1L',
      barcode: '8801001234575',
      sku: 'DAI-001',
      description: 'Fresh whole milk',
      categoryName: 'Dairy',
      purchasePrice: 2000,
      sellingPrice: 3500,
      stock: 30,
      minStockLevel: 10,
      unit: 'bottle',
    },
    {
      name: 'Yogurt Strawberry',
      barcode: '8801001234576',
      sku: 'DAI-002',
      description: 'Strawberry flavored yogurt',
      categoryName: 'Dairy',
      purchasePrice: 800,
      sellingPrice: 1500,
      stock: 50,
      minStockLevel: 15,
      unit: 'cup',
    },
    {
      name: 'Cheese Slices',
      barcode: '8801001234577',
      sku: 'DAI-003',
      description: 'Processed cheese slices',
      categoryName: 'Dairy',
      purchasePrice: 3000,
      sellingPrice: 5000,
      stock: 15,
      minStockLevel: 5,
      unit: 'pack',
    },
    {
      name: 'Apple (Red)',
      barcode: '8801001234578',
      sku: 'FRV-001',
      description: 'Fresh red apples',
      categoryName: 'Fruits & Vegetables',
      purchasePrice: 1500,
      sellingPrice: 2500,
      stock: 60,
      minStockLevel: 20,
      unit: 'kg',
    },
    {
      name: 'Banana',
      barcode: '8801001234579',
      sku: 'FRV-002',
      description: 'Fresh bananas',
      categoryName: 'Fruits & Vegetables',
      purchasePrice: 2000,
      sellingPrice: 3500,
      stock: 40,
      minStockLevel: 15,
      unit: 'kg',
    },
    {
      name: 'Tomato',
      barcode: '8801001234580',
      sku: 'FRV-003',
      description: 'Fresh tomatoes',
      categoryName: 'Fruits & Vegetables',
      purchasePrice: 1800,
      sellingPrice: 3000,
      stock: 35,
      minStockLevel: 10,
      unit: 'kg',
    },
    {
      name: 'Onion',
      barcode: '8801001234581',
      sku: 'FRV-004',
      description: 'Fresh onions',
      categoryName: 'Fruits & Vegetables',
      purchasePrice: 1200,
      sellingPrice: 2000,
      stock: 50,
      minStockLevel: 15,
      unit: 'kg',
    },
    {
      name: 'Bread White',
      barcode: '8801001234582',
      sku: 'GEN-001',
      description: 'White bread loaf',
      categoryName: 'General',
      purchasePrice: 1500,
      sellingPrice: 2500,
      stock: 25,
      minStockLevel: 8,
      unit: 'loaf',
    },
    {
      name: 'Instant Noodles',
      barcode: '8801001234583',
      sku: 'GEN-002',
      description: 'Chicken flavor instant noodles',
      categoryName: 'General',
      purchasePrice: 500,
      sellingPrice: 1000,
      stock: 80,
      minStockLevel: 20,
      unit: 'pack',
    },
    {
      name: 'Cooking Oil 1L',
      barcode: '8801001234584',
      sku: 'GEN-003',
      description: 'Vegetable cooking oil',
      categoryName: 'General',
      purchasePrice: 3500,
      sellingPrice: 5500,
      stock: 20,
      minStockLevel: 5,
      unit: 'bottle',
    },
  ]

  console.log('\n📦 Creating products...')
  let productCount = 0
  for (const product of products) {
    const category = createdCategories.find(c => c.name === product.categoryName)
    if (!category) {
      console.log(`⚠️  Category not found: ${product.categoryName}, skipping product: ${product.name}`)
      continue
    }

    try {
      await prisma.product.upsert({
        where: { barcode: product.barcode },
        update: {
          name: product.name,
          sku: product.sku,
          description: product.description,
          categoryId: category.id,
          purchasePrice: new Decimal(product.purchasePrice),
          sellingPrice: new Decimal(product.sellingPrice),
          stock: new Decimal(product.stock),
          minStockLevel: new Decimal(product.minStockLevel),
          unit: product.unit,
          isActive: true,
        },
        create: {
          name: product.name,
          barcode: product.barcode,
          sku: product.sku,
          description: product.description,
          categoryId: category.id,
          purchasePrice: new Decimal(product.purchasePrice),
          sellingPrice: new Decimal(product.sellingPrice),
          stock: new Decimal(product.stock),
          minStockLevel: new Decimal(product.minStockLevel),
          unit: product.unit,
          isActive: true,
        },
      })
      productCount++
      console.log(`  ✅ ${product.name} (${product.barcode})`)
    } catch (error) {
      console.log(`  ❌ Error creating ${product.name}:`, error)
    }
  }

  console.log(`\n✅ Created ${productCount} products`)

  console.log('\n🎉 Database seed completed!')
  console.log('\n📝 Default credentials:')
  console.log('   Username: admin')
  console.log('   Password: admin123')
  console.log(`\n📦 Created ${productCount} products across ${createdCategories.length} categories`)
  console.log('\n⚠️  Please change the default password after first login!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

