CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 192f9d705da0

CREATE TABLE clips (
    id VARCHAR(40) NOT NULL, 
    title VARCHAR(150) NOT NULL, 
    subject VARCHAR(50) NOT NULL, 
    topic VARCHAR(100) NOT NULL, 
    exam VARCHAR(40) NOT NULL, 
    creator VARCHAR(80) NOT NULL, 
    credentials VARCHAR(100) NOT NULL, 
    duration INTEGER NOT NULL, 
    video_path TEXT NOT NULL, 
    poster_path TEXT NOT NULL, 
    transcript TEXT NOT NULL, 
    takeaway TEXT NOT NULL, 
    prompt TEXT NOT NULL, 
    source_url TEXT NOT NULL, 
    PRIMARY KEY (id)
);

CREATE TABLE questions (
    id VARCHAR(40) NOT NULL, 
    subject VARCHAR(50) NOT NULL, 
    topic VARCHAR(100) NOT NULL, 
    difficulty VARCHAR(20) NOT NULL, 
    stem TEXT NOT NULL, 
    options JSON NOT NULL, 
    correct_index INTEGER NOT NULL, 
    explanation TEXT NOT NULL, 
    source_url TEXT NOT NULL, 
    PRIMARY KEY (id)
);

CREATE INDEX ix_questions_subject ON questions (subject);

CREATE INDEX ix_questions_topic ON questions (topic);

CREATE TABLE users (
    id VARCHAR(36) NOT NULL, 
    email VARCHAR(254), 
    password_hash TEXT, 
    name VARCHAR(80) NOT NULL, 
    year VARCHAR(30) NOT NULL, 
    location VARCHAR(80) NOT NULL, 
    timezone VARCHAR(80) NOT NULL, 
    exam_name VARCHAR(100) NOT NULL, 
    exam_date DATE NOT NULL, 
    daily_target INTEGER NOT NULL, 
    is_guest BOOL NOT NULL, 
    created_at DATETIME(6) NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (email)
);

CREATE TABLE anatomy_visits (
    user_id VARCHAR(36) NOT NULL, 
    structure_id VARCHAR(50) NOT NULL, 
    created_at DATETIME(6) NOT NULL, 
    PRIMARY KEY (user_id, structure_id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE attempts (
    id VARCHAR(36) NOT NULL, 
    user_id VARCHAR(36) NOT NULL, 
    question_id VARCHAR(40) NOT NULL, 
    request_id VARCHAR(36) NOT NULL, 
    selected_index INTEGER NOT NULL, 
    correct BOOL NOT NULL, 
    created_at DATETIME(6) NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(question_id) REFERENCES questions (id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
    UNIQUE (user_id, request_id)
);

CREATE INDEX ix_attempts_created_at ON attempts (created_at);

CREATE INDEX ix_attempts_user_id ON attempts (user_id);

CREATE TABLE bookmarks (
    user_id VARCHAR(36) NOT NULL, 
    question_id VARCHAR(40) NOT NULL, 
    PRIMARY KEY (user_id, question_id), 
    FOREIGN KEY(question_id) REFERENCES questions (id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE clip_views (
    user_id VARCHAR(36) NOT NULL, 
    clip_id VARCHAR(40) NOT NULL, 
    day DATE NOT NULL, 
    PRIMARY KEY (user_id, clip_id, day), 
    FOREIGN KEY(clip_id) REFERENCES clips (id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE goals (
    user_id VARCHAR(36) NOT NULL, 
    day DATE NOT NULL, 
    `key` VARCHAR(30) NOT NULL, 
    done BOOL NOT NULL, 
    PRIMARY KEY (user_id, day, `key`), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE refresh_sessions (
    id VARCHAR(36) NOT NULL, 
    user_id VARCHAR(36) NOT NULL, 
    token_hash VARCHAR(64) NOT NULL, 
    expires_at DATETIME(6) NOT NULL, 
    revoked BOOL NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
    UNIQUE (token_hash)
);

CREATE INDEX ix_refresh_sessions_user_id ON refresh_sessions (user_id);

CREATE TABLE saved_items (
    id VARCHAR(36) NOT NULL, 
    user_id VARCHAR(36) NOT NULL, 
    clip_id VARCHAR(40) NOT NULL, 
    kind VARCHAR(20) NOT NULL, 
    title TEXT NOT NULL, 
    content TEXT NOT NULL, 
    subject VARCHAR(50) NOT NULL, 
    created_at DATETIME(6) NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(clip_id) REFERENCES clips (id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
    UNIQUE (user_id, clip_id, kind)
);

CREATE INDEX ix_saved_items_user_id ON saved_items (user_id);

INSERT INTO alembic_version (version_num) VALUES ('192f9d705da0');

