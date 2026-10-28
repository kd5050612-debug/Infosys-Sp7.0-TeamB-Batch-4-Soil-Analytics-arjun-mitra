
const nodemailer = require('nodemailer')
require('dotenv').config()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
})

async function sendOtpEmail(email, otp) {
  return transporter.sendMail({
    from: `"AgriSync" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your AgriSync verification code',
    text: `Your AgriSync verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f7f5eb;padding:30px;color:#263e2b">
        <div style="max-width:480px;margin:auto;background:#fffdf7;padding:32px;border-radius:18px">
          <h1 style="color:#315b39;margin-top:0">AgriSync 🌱</h1>
          <h2>Verify your email</h2>
          <p>Use the verification code below to continue creating your account.</p>
          <div style="background:#e7ebdf;padding:20px;text-align:center;border-radius:12px;font-size:32px;font-weight:bold;letter-spacing:8px">
            ${otp}
          </div>
          <p>This code expires in <strong>5 minutes</strong>.</p>
          <p style="font-size:12px;color:#777">If you didn't request this code, you can ignore this email.</p>
        </div>
      </div>
    `,
  })
}

async function sendPasswordResetOtp(email, otp) {
  return transporter.sendMail({
    from: `"AgriSync" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your AgriSync password reset code',
    text: `Your AgriSync password reset code is ${otp}. It expires in 5 minutes and can only be used once. If you did not request a password reset, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f7f5eb;padding:30px;color:#263e2b">
        <div style="max-width:480px;margin:auto;background:#fffdf7;padding:32px;border-radius:18px">
          <h1 style="color:#315b39;margin-top:0">AgriSync</h1>
          <h2>Reset your password</h2>
          <p>Use the verification code below to reset your password.</p>
          <div style="background:#e7ebdf;padding:20px;text-align:center;border-radius:12px;font-size:32px;font-weight:bold;letter-spacing:8px">
            ${otp}
          </div>
          <p>This code expires in <strong>5 minutes</strong> and can only be used once.</p>
          <p style="font-size:12px;color:#777">If you didn't request this code, you can ignore this email.</p>
        </div>
      </div>
    `,
  })
}

module.exports = { transporter, sendOtpEmail, sendPasswordResetOtp }
