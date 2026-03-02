const dotenv = require('dotenv');
const path = require('path');

// Load .env from the same directory as this script
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('Environment Variables Check:');
console.log('===========================');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('PORT:', process.env.PORT || 'NOT SET');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set (' + process.env.MONGO_URI.substring(0, 30) + '...)' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set (' + process.env.JWT_SECRET.substring(0, 20) + '...)' : 'NOT SET');
console.log('JWT_EXPIRE:', process.env.JWT_EXPIRE || 'NOT SET');
console.log('CLIENT_URL:', process.env.CLIENT_URL || 'NOT SET');
console.log('===========================');

if (!process.env.JWT_SECRET) {
  console.error('\n❌ ERROR: JWT_SECRET is not set!');
  console.error('Login will fail. Please check your .env file.\n');
  process.exit(1);
} else {
  console.log('\n✅ All environment variables are set correctly!\n');
}
