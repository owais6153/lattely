import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1725753600000 implements MigrationInterface {
  name = 'InitialSchema1725753600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id varchar(36) NOT NULL,
        email varchar(255) NOT NULL,
        passwordHash varchar(255) NOT NULL,
        role varchar(10) NOT NULL DEFAULT 'USER',
        isEmailVerified tinyint NOT NULL DEFAULT 0,
        reelUploaded tinyint NOT NULL DEFAULT 0,
        permissionsCompleted tinyint NOT NULL DEFAULT 0,
        gender varchar(10) NOT NULL DEFAULT 'NON_BINARY',
        firstName varchar(60) NOT NULL,
        lastName varchar(60) NOT NULL,
        birthDate date NOT NULL,
        address varchar(300) NULL,
        lat double NULL,
        lng double NULL,
        city varchar(100) NULL,
        country varchar(100) NULL,
        interestedGender varchar(20) NULL,
        weekdaysAvailability varchar(10) NULL,
        weekendsAvailability varchar(10) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX IDX_users_email (email),
        INDEX IDX_users_discovery (gender, lat, lng),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reels (
        id varchar(36) NOT NULL,
        videoUrl varchar(500) NOT NULL,
        durationSec int NOT NULL,
        lat double NULL,
        lng double NULL,
        tags json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        userId varchar(36) NULL,
        UNIQUE INDEX IDX_reels_user (userId),
        PRIMARY KEY (id),
        CONSTRAINT FK_reels_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id varchar(36) NOT NULL,
        purpose varchar(20) NOT NULL,
        codeHash varchar(255) NOT NULL,
        expiresAt datetime NOT NULL,
        lastSentAt datetime NULL,
        attemptCount int NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        userId varchar(36) NULL,
        INDEX IDX_otps_purpose (purpose),
        PRIMARY KEY (id),
        CONSTRAINT FK_otps_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS date_requests (
        id varchar(36) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'PENDING',
        windowStartAt datetime NOT NULL,
        windowEndAt datetime NOT NULL,
        expiresAt datetime NOT NULL,
        requesterDecision varchar(3) NULL,
        recipientDecision varchar(3) NULL,
        confirmedAt datetime NULL,
        reminderSentAt datetime NULL,
        feedbackReminderSentAt datetime NULL,
        acceptedStartAt datetime NULL,
        acceptedDurationSec int NULL,
        acceptedGooglePlaceId varchar(120) NULL,
        acceptedRestaurantName varchar(200) NULL,
        acceptedRestaurantAddress varchar(300) NULL,
        acceptedRestaurantLat double NULL,
        acceptedRestaurantLng double NULL,
        rejectedAt datetime NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        requesterId varchar(36) NULL,
        recipientId varchar(36) NULL,
        reelId varchar(36) NULL,
        PRIMARY KEY (id),
        INDEX IDX_date_requests_requester (requesterId),
        INDEX IDX_date_requests_recipient (recipientId),
        INDEX IDX_date_requests_status_expiry (status, expiresAt),
        INDEX IDX_date_requests_requester_created (requesterId, createdAt),
        CONSTRAINT FK_date_requests_requester FOREIGN KEY (requesterId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_date_requests_recipient FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_date_requests_reel FOREIGN KEY (reelId) REFERENCES reels(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pre_date_calls (
        id varchar(36) NOT NULL,
        channelName varchar(120) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'PENDING',
        startedAt datetime NULL,
        completedAt datetime NULL,
        endsAt datetime NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        requestId varchar(36) NULL,
        UNIQUE INDEX IDX_pre_date_calls_request (requestId),
        PRIMARY KEY (id),
        CONSTRAINT FK_pre_date_calls_request FOREIGN KEY (requestId) REFERENCES date_requests(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cooldowns (
        id varchar(36) NOT NULL, reason varchar(30) NOT NULL, expiresAt datetime NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), userAId varchar(36) NULL, userBId varchar(36) NULL,
        UNIQUE INDEX IDX_cooldowns_pair (userAId, userBId), INDEX IDX_cooldowns_expiry (expiresAt), PRIMARY KEY (id),
        CONSTRAINT FK_cooldowns_a FOREIGN KEY (userAId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_cooldowns_b FOREIGN KEY (userBId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_blocks (
        id varchar(36) NOT NULL, createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), blockerId varchar(36) NULL, blockedId varchar(36) NULL,
        UNIQUE INDEX IDX_user_blocks_pair (blockerId, blockedId), PRIMARY KEY (id),
        CONSTRAINT FK_user_blocks_blocker FOREIGN KEY (blockerId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_user_blocks_blocked FOREIGN KEY (blockedId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS safety_reports (
        id varchar(36) NOT NULL, reason varchar(40) NOT NULL, details varchar(1000) NULL, status varchar(20) NOT NULL DEFAULT 'OPEN',
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), reporterId varchar(36) NULL, reportedId varchar(36) NULL, requestId varchar(36) NULL,
        PRIMARY KEY (id), INDEX IDX_safety_reports_status (status),
        CONSTRAINT FK_reports_reporter FOREIGN KEY (reporterId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_reports_reported FOREIGN KEY (reportedId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_reports_request FOREIGN KEY (requestId) REFERENCES date_requests(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS meetup_feedback (
        id varchar(36) NOT NULL, attended tinyint NOT NULL, feltSafe tinyint NOT NULL, wouldMeetAgain tinyint NOT NULL, notes varchar(1000) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), requestId varchar(36) NULL, authorId varchar(36) NULL,
        UNIQUE INDEX IDX_feedback_request_author (requestId, authorId), PRIMARY KEY (id),
        CONSTRAINT FK_feedback_request FOREIGN KEY (requestId) REFERENCES date_requests(id) ON DELETE CASCADE,
        CONSTRAINT FK_feedback_author FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id varchar(36) NOT NULL, token varchar(255) NOT NULL, platform varchar(10) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), userId varchar(36) NULL,
        UNIQUE INDEX IDX_push_tokens_token (token), INDEX IDX_push_tokens_user (userId), PRIMARY KEY (id),
        CONSTRAINT FK_push_tokens_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id varchar(36) NOT NULL,
        tokenHash char(64) NOT NULL,
        expiresAt datetime NOT NULL,
        revokedAt datetime NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        userId varchar(36) NULL,
        UNIQUE INDEX IDX_refresh_tokens_hash (tokenHash),
        INDEX IDX_refresh_tokens_user (userId),
        PRIMARY KEY (id),
        CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS push_tokens');
    await queryRunner.query('DROP TABLE IF EXISTS meetup_feedback');
    await queryRunner.query('DROP TABLE IF EXISTS safety_reports');
    await queryRunner.query('DROP TABLE IF EXISTS user_blocks');
    await queryRunner.query('DROP TABLE IF EXISTS cooldowns');
    await queryRunner.query('DROP TABLE IF EXISTS refresh_tokens');
    await queryRunner.query('DROP TABLE IF EXISTS pre_date_calls');
    await queryRunner.query('DROP TABLE IF EXISTS date_requests');
    await queryRunner.query('DROP TABLE IF EXISTS otps');
    await queryRunner.query('DROP TABLE IF EXISTS reels');
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
