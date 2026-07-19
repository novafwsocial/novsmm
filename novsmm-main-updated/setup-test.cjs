const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = new PrismaClient();

async function main() {
  // Find existing test users
  let testUser = await db.user.findUnique({ where: { email: 'test@test.com' } });
  let adminUser = await db.user.findUnique({ where: { email: 'admin@novsmm.io' } });

  if (!testUser) {
    testUser = await db.user.create({
      data: { email: 'test@test.com', name: 'Test User', role: 'reseller', status: 'active',
              balance: 50.00, passwordHash: bcrypt.hashSync('pentest123', 12) }
    });
  } else {
    testUser = await db.user.update({
      where: { id: testUser.id },
      data: { passwordHash: bcrypt.hashSync('pentest123', 12), status: 'active', balance: 50.00 }
    });
  }

  if (!adminUser) {
    adminUser = await db.user.create({
      data: { email: 'admin@novsmm.io', name: 'Admin', role: 'admin', status: 'active',
              balance: 0, passwordHash: bcrypt.hashSync('pentest123', 12) }
    });
  } else {
    adminUser = await db.user.update({
      where: { id: adminUser.id },
      data: { passwordHash: bcrypt.hashSync('pentest123', 12), status: 'active', role: 'admin' }
    });
  }

  // Create a second user (attacker)
  let attacker = await db.user.findUnique({ where: { email: 'attacker@pentest.local' } });
  if (!attacker) {
    attacker = await db.user.create({
      data: { email: 'attacker@pentest.local', name: 'Attacker', role: 'reseller', status: 'active',
              balance: 10.00, passwordHash: bcrypt.hashSync('pentest123', 12) }
    });
  }

  // Create a service
  let svc = await db.service.findFirst();
  if (!svc) {
    const provider = await db.provider.create({ data: { name: 'TestProvider', apiUrl: 'https://huntsmm.com/api', apiKey: 'xxx' } });
    svc = await db.service.create({
      data: { name: 'Instagram Followers', platform: 'Instagram', price: 1.50, cost: 1.00,
              minQty: 10, maxQty: 50000, status: 'active', providerId: provider.id }
    });
  }

  // Create NowPayments + PayPal payment methods (without real creds; just to test webhook routes' behavior)
  let pmNP = await db.paymentMethod.findUnique({ where: { name: 'NowPayments' } });
  if (!pmNP) {
    pmNP = await db.paymentMethod.create({ data: { name: 'NowPayments', status: 'active', config: null } });
  }

  let pmPP = await db.paymentMethod.findUnique({ where: { name: 'PayPal' } });
  if (!pmPP) {
    pmPP = await db.paymentMethod.create({ data: { name: 'PayPal', status: 'active', config: null } });
  }

  // Set NowPayments config with a known ipnSecret
  const crypto_utils = require('./src/lib/crypto-utils');
  const npConfig = JSON.stringify({ apiKey: 'fakekey', ipnSecret: 'pentest-np-ipn-secret', payCurrency: 'usdttrc20' });
  const encNp = crypto_utils.encryptJSON ? crypto_utils.encryptJSON(npConfig) : null;

  // Create test API keys for testUser
  // 1) Read-only key
  const readKeyPlain = 'nvsk_live_readonly_pentest_key_001';
  const readLookupHash = crypto.createHash('sha256').update(readKeyPlain).digest('hex');
  let readKey = await db.apiKey.findFirst({ where: { lookupHash: readLookupHash } });
  if (!readKey) {
    readKey = await db.apiKey.create({
      data: { publicId: 'apik_read_001', userId: testUser.id, name: 'Read-only pentest key',
              keyHash: bcrypt.hashSync(readKeyPlain, 12), lookupHash: readLookupHash,
              permissions: 'read', status: 'active', expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }
    });
  } else {
    readKey = await db.apiKey.update({
      where: { id: readKey.id },
      data: { keyHash: bcrypt.hashSync(readKeyPlain, 12), lookupHash: readLookupHash,
              permissions: 'read', status: 'active',
              expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }
    });
  }

  // 2) Order key
  const orderKeyPlain = 'nvsk_live_orderkey_pentest_key_002';
  const orderLookupHash = crypto.createHash('sha256').update(orderKeyPlain).digest('hex');
  let orderKey = await db.apiKey.findFirst({ where: { lookupHash: orderLookupHash } });
  if (!orderKey) {
    orderKey = await db.apiKey.create({
      data: { publicId: 'apik_order_002', userId: testUser.id, name: 'Order pentest key',
              keyHash: bcrypt.hashSync(orderKeyPlain, 12), lookupHash: orderLookupHash,
              permissions: 'read,order', status: 'active',
              expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }
    });
  } else {
    orderKey = await db.apiKey.update({
      where: { id: orderKey.id },
      data: { keyHash: bcrypt.hashSync(orderKeyPlain, 12), lookupHash: orderLookupHash,
              permissions: 'read,order', status: 'active',
              expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }
    });
  }

  // Clean up any old API rate-limit state for these keys (we'll do live reset)
  console.log(JSON.stringify({
    testUserId: testUser.id, testUserEmail: testUser.email, testUserBalance: testUser.balance,
    adminUserId: adminUser.id, attackerId: attacker.id,
    serviceId: svc.id, serviceName: svc.name,
    servicePrice: svc.price, serviceMin: svc.minQty, serviceMax: svc.maxQty,
    pmNowPaymentsId: pmNP.id, pmPayPalId: pmPP.id,
    readKeyId: readKey.id, readKeyPlain, orderKeyId: orderKey.id, orderKeyPlain
  }, null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
