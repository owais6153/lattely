import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ProductFlow1725753700000 implements MigrationInterface {
  name = 'ProductFlow1725753700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const add = async (table: string, column: TableColumn) => {
      if (!(await queryRunner.hasColumn(table, column.name))) await queryRunner.addColumn(table, column);
    };
    await add('users', new TableColumn({ name: 'birthDate', type: 'date', isNullable: true }));
    await add('users', new TableColumn({ name: 'permissionsCompleted', type: 'tinyint', default: 0 }));
    await add('otps', new TableColumn({ name: 'attemptCount', type: 'int', default: 0 }));
    await add('date_requests', new TableColumn({ name: 'windowStartAt', type: 'datetime', isNullable: true }));
    await add('date_requests', new TableColumn({ name: 'windowEndAt', type: 'datetime', isNullable: true }));
    await add('date_requests', new TableColumn({ name: 'expiresAt', type: 'datetime', isNullable: true }));
    await add('date_requests', new TableColumn({ name: 'requesterDecision', type: 'varchar', length: '3', isNullable: true }));
    await add('date_requests', new TableColumn({ name: 'recipientDecision', type: 'varchar', length: '3', isNullable: true }));
    await add('date_requests', new TableColumn({ name: 'confirmedAt', type: 'datetime', isNullable: true }));
    await add('date_requests', new TableColumn({ name: 'reminderSentAt', type: 'datetime', isNullable: true }));
    await add('date_requests', new TableColumn({ name: 'feedbackReminderSentAt', type: 'datetime', isNullable: true }));
    await add('pre_date_calls', new TableColumn({ name: 'endsAt', type: 'datetime', isNullable: true }));

    await queryRunner.query(`UPDATE date_requests SET status = 'CANCELLED' WHERE status IN ('PENDING','NEGOTIATING','ACCEPTED') AND windowStartAt IS NULL`);
    const usersTable = await queryRunner.getTable('users');
    const requestsTable = await queryRunner.getTable('date_requests');
    if (!usersTable?.indices.some((index) => index.name === 'IDX_users_discovery')) await queryRunner.query(`CREATE INDEX IDX_users_discovery ON users (gender, lat, lng)`);
    if (!requestsTable?.indices.some((index) => index.name === 'IDX_date_requests_status_expiry')) await queryRunner.query(`CREATE INDEX IDX_date_requests_status_expiry ON date_requests (status, expiresAt)`);
    if (!requestsTable?.indices.some((index) => index.name === 'IDX_date_requests_requester_created')) await queryRunner.query(`CREATE INDEX IDX_date_requests_requester_created ON date_requests (requesterId, createdAt)`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS cooldowns (id varchar(36) NOT NULL, reason varchar(30) NOT NULL, expiresAt datetime NOT NULL, createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), userAId varchar(36) NULL, userBId varchar(36) NULL, UNIQUE INDEX IDX_cooldowns_pair (userAId,userBId), INDEX IDX_cooldowns_expiry (expiresAt), PRIMARY KEY(id), CONSTRAINT FK_cooldowns_a FOREIGN KEY(userAId) REFERENCES users(id) ON DELETE CASCADE, CONSTRAINT FK_cooldowns_b FOREIGN KEY(userBId) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS user_blocks (id varchar(36) NOT NULL, createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), blockerId varchar(36) NULL, blockedId varchar(36) NULL, UNIQUE INDEX IDX_user_blocks_pair (blockerId,blockedId), PRIMARY KEY(id), CONSTRAINT FK_user_blocks_blocker FOREIGN KEY(blockerId) REFERENCES users(id) ON DELETE CASCADE, CONSTRAINT FK_user_blocks_blocked FOREIGN KEY(blockedId) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS safety_reports (id varchar(36) NOT NULL, reason varchar(40) NOT NULL, details varchar(1000) NULL, status varchar(20) NOT NULL DEFAULT 'OPEN', createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), reporterId varchar(36) NULL, reportedId varchar(36) NULL, requestId varchar(36) NULL, PRIMARY KEY(id), INDEX IDX_safety_reports_status(status), CONSTRAINT FK_reports_reporter FOREIGN KEY(reporterId) REFERENCES users(id) ON DELETE CASCADE, CONSTRAINT FK_reports_reported FOREIGN KEY(reportedId) REFERENCES users(id) ON DELETE CASCADE, CONSTRAINT FK_reports_request FOREIGN KEY(requestId) REFERENCES date_requests(id) ON DELETE SET NULL) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS meetup_feedback (id varchar(36) NOT NULL, attended tinyint NOT NULL, feltSafe tinyint NOT NULL, wouldMeetAgain tinyint NOT NULL, notes varchar(1000) NULL, createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), requestId varchar(36) NULL, authorId varchar(36) NULL, UNIQUE INDEX IDX_feedback_request_author(requestId,authorId), PRIMARY KEY(id), CONSTRAINT FK_feedback_request FOREIGN KEY(requestId) REFERENCES date_requests(id) ON DELETE CASCADE, CONSTRAINT FK_feedback_author FOREIGN KEY(authorId) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS push_tokens (id varchar(36) NOT NULL, token varchar(255) NOT NULL, platform varchar(10) NOT NULL, createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), userId varchar(36) NULL, UNIQUE INDEX IDX_push_tokens_token(token), INDEX IDX_push_tokens_user(userId), PRIMARY KEY(id), CONSTRAINT FK_push_tokens_user FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS push_tokens');
    await queryRunner.query('DROP TABLE IF EXISTS meetup_feedback');
    await queryRunner.query('DROP TABLE IF EXISTS safety_reports');
    await queryRunner.query('DROP TABLE IF EXISTS user_blocks');
    await queryRunner.query('DROP TABLE IF EXISTS cooldowns');
    await queryRunner.dropColumn('pre_date_calls', 'endsAt');
    for (const column of ['feedbackReminderSentAt','reminderSentAt','confirmedAt','recipientDecision','requesterDecision','expiresAt','windowEndAt','windowStartAt']) await queryRunner.dropColumn('date_requests', column);
    await queryRunner.dropColumn('otps', 'attemptCount');
    await queryRunner.dropColumn('users', 'birthDate');
    await queryRunner.dropColumn('users', 'permissionsCompleted');
  }
}
