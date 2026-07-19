console.log('LICENSE_ENCRYPTION_KEY:', process.env.LICENSE_ENCRYPTION_KEY);
console.log('MP_WEBHOOK_SECRET:', process.env.MP_WEBHOOK_SECRET);
console.log('MP_ACCESS_TOKEN:', process.env.MP_ACCESS_TOKEN);

const { PrismaClient } = require('/home/z/my-project/node_modules/@prisma/client');
const db = new PrismaClient();
const crypto = require('crypto');
function getKey() { return crypto.createHash('sha256').update(process.env.LICENSE_ENCRYPTION_KEY).digest(); }
function decrypt(s) {
  if (typeof s !== 'string') return null;
  const [ivB64, tagB64, encB64] = s.split(':');
  if (!ivB64 || !tagB64 || !encB64) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]).toString('utf8');
  } catch (e) {
    console.log('decrypt err:', e.message);
    return null;
  }
}
async function main() {
  const pm = await db.paymentMethod.findUnique({ where: { name: 'NowPayments' } });
  console.log('config type:', typeof pm.config);
  console.log('config (first 80):', String(pm.config).slice(0, 80));
  const decrypted = decrypt(pm.config);
  console.log('decrypted:', decrypted);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
