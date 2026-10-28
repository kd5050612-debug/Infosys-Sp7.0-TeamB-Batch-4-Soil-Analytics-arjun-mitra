CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_email (email)
);

CREATE TABLE IF NOT EXISTS email_otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  pending_name VARCHAR(100) DEFAULT NULL,
  pending_password_hash VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_otps_email (email),
  KEY idx_email_otps_expires_at (expires_at)
);

CREATE TABLE IF NOT EXISTS email_password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_password_reset_email (email),
  KEY idx_password_reset_expiry (expires_at)
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_email_otps_email ON email_otps (email);
CREATE INDEX idx_email_otps_expires_at ON email_otps (expires_at);

CREATE TABLE IF NOT EXISTS soil_analyses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  nitrogen DECIMAL(8, 2) NOT NULL,
  phosphorus DECIMAL(8, 2) NOT NULL,
  potassium DECIMAL(8, 2) NOT NULL,
  temperature DECIMAL(8, 2) NOT NULL,
  humidity DECIMAL(8, 2) NOT NULL,
  ph DECIMAL(5, 2) NOT NULL,
  rainfall DECIMAL(10, 2) NOT NULL,
  recommended_crop VARCHAR(100) NOT NULL,
  confidence DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_soil_analyses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_soil_analyses_user_created (user_id, created_at)
);
