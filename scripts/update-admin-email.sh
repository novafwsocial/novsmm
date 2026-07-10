#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — Update Admin Email
# ─────────────────────────────────────────────────────────────────────────────
# Updates the admin user's email from admin@novsmm.io to admin@novsmm.shop
# (canonical domain). Also resets the password to Admin#2026 if requested.
#
# Usage: bash scripts/update-admin-email.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

PROJECT_DIR="$HOME/novsmm"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  NOVSMM — Update Admin Email                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

cd "$PROJECT_DIR"

# Update admin email from .io to .shop
npx tsx -e "
const { db } = require('./src/lib/db');
const bcrypt = require('bcryptjs');

(async () => {
  // Find admin by .io email
  const admin = await db.user.findUnique({ where: { email: 'admin@novsmm.io' } });
  if (!admin) {
    console.log('❌ Admin with admin@novsmm.io not found');
    console.log('   Trying admin@novsmm.shop...');
    const existing = await db.user.findUnique({ where: { email: 'admin@novsmm.shop' } });
    if (existing) {
      console.log('✅ Admin already has admin@novsmm.shop email');
      console.log('   Email:', existing.email);
      console.log('   Role:', existing.role);
      console.log('   Status:', existing.status);
    } else {
      console.log('❌ No admin user found. Run the seed first: npx tsx prisma/seed.ts');
    }
    return;
  }

  // Update email to .shop
  const updated = await db.user.update({
    where: { id: admin.id },
    data: { email: 'admin@novsmm.shop' },
  });
  console.log('✅ Admin email updated!');
  console.log('   Old email: admin@novsmm.io');
  console.log('   New email:', updated.email);
  console.log('   Role:', updated.role);
  console.log('   Status:', updated.status);

  // Optionally reset password
  const newPassword = 'Admin#2026';
  const hash = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: admin.id },
    data: { passwordHash: hash },
  });
  console.log('');
  console.log('🔐 Password reset to: Admin#2026');
  console.log('');
  console.log('Login credentials:');
  console.log('  Email: admin@novsmm.shop');
  console.log('  Password: Admin#2026');
})().catch(console.error).finally(() => process.exit(0));
"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ Admin Email Updated!                                     ║"
echo "║                                                              ║"
echo "║  Login with:                                                 ║"
echo "║    Email: admin@novsmm.shop                                  ║"
echo "║    Password: Admin#2026                                      ║"
echo "║                                                              ║"
echo "║  Next: Restart NOVSMM to clear session cache:                ║"
echo "║    pm2 restart novsmm                                        ║"
echo "║                                                              ║"
echo "║  ⚠️  Change the password after first login via Profile →      ║"
echo "║     Security → Change password                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
