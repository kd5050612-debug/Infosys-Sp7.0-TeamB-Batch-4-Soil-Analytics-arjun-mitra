
require('dotenv').config()
const { transporter } = require('./config/mailer')

async function testEmail() {
  try {
    await transporter.verify()
    console.log('Email connection successful')
  } catch (error) {
    console.error('Email connection failed:', error.message)
    process.exitCode = 1
  }
}

testEmail()
