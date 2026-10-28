USE agrisync_db;

CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_uuid CHAR(36) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    login_method ENUM('password', 'google') NOT NULL,
    ip_address VARBINARY(16) NULL,
    user_agent VARCHAR(1000) NULL,
    started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at DATETIME(3) NOT NULL,
    ended_at DATETIME(3) NULL,
    end_reason ENUM('logout', 'expired', 'revoked', 'security_action') NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_sessions_user_started (user_id, started_at),
    INDEX idx_sessions_active (user_id, ended_at),
    INDEX idx_sessions_expiry (expires_at)
);

CREATE TABLE IF NOT EXISTS auth_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    session_id BIGINT UNSIGNED NULL,
    attempted_email VARCHAR(255) NULL,
    event_type ENUM('signup', 'login_success', 'login_failure', 'logout', 'google_login', 'otp_requested', 'otp_verified', 'otp_failed', 'password_changed', 'session_revoked') NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address VARBINARY(16) NULL,
    user_agent VARCHAR(1000) NULL,
    details JSON NULL,
    occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL,
    INDEX idx_auth_user_time (user_id, occurred_at),
    INDEX idx_auth_event_time (event_type, occurred_at),
    INDEX idx_auth_email_time (attempted_email, occurred_at)
);

CREATE TABLE IF NOT EXISTS user_activity_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id BIGINT UNSIGNED NULL,
    event_name VARCHAR(100) NOT NULL,
    page_path VARCHAR(500) NULL,
    metadata JSON NULL,
    occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL,
    INDEX idx_activity_user_time (user_id, occurred_at),
    INDEX idx_activity_event_time (event_name, occurred_at),
    INDEX idx_activity_session (session_id, occurred_at)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NULL,
    before_data JSON NULL,
    after_data JSON NULL,
    request_id CHAR(36) NULL,
    occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_actor_time (actor_user_id, occurred_at),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_request (request_id)
);
