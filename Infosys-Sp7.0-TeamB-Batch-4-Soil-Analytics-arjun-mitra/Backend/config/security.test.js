const test = require('node:test')
const assert = require('node:assert/strict')

process.env.OTP_HASH_SECRET = 'test-only-otp-hash-secret'

const {
  compareOtp,
  getRateLimitKey,
  hashOtp,
  isValidEmail,
  validatePassword,
} = require('./security')

test('valid emails are accepted', () => {
  assert.equal(isValidEmail('farmer@example.com'), true)
  assert.equal(isValidEmail(' invalid@domain.com '), true)
  assert.equal(isValidEmail('bad-email'), false)
})

test('password policy rejects weak values', () => {
  assert.equal(validatePassword('short').ok, false)
  assert.equal(validatePassword('password123').ok, false)
  assert.equal(validatePassword('GreenFields@2024Secure!').ok, true)
  assert.equal(validatePassword('a'.repeat(73)).ok, false)
})

test('OTP hashes compare safely and consistently', () => {
  const value = '123456'
  const hashed = hashOtp(value)
  assert.equal(compareOtp(value, hashed), true)
  assert.equal(compareOtp('654321', hashed), false)
})

test('rate limit key normalizes identity data', () => {
  const req = {
    ip: '203.0.113.9',
    body: { email: ' FARMER@EXAMPLE.COM ' },
  }

  assert.equal(getRateLimitKey(req), '203.0.113.9:farmer@example.com')
})
