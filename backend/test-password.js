const bcrypt = require('bcryptjs');

async function testPassword() {
  const password = 'password';
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  console.log('password', password);
  console.log('hashedPassword', hashedPassword);

  const isMatch = await bcrypt.compare(password, hashedPassword);
  console.log('isMatch', isMatch);
}

testPassword();
