import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ProductionReconciliation1725753800000
  implements MigrationInterface
{
  name = 'ProductionReconciliation1725753800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('date_proposals')) {
      await queryRunner.dropTable('date_proposals', true);
    }

    if (await queryRunner.hasColumn('users', 'birthDate')) {
      await queryRunner.query(
        `UPDATE users SET birthDate = '1970-01-01' WHERE birthDate IS NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE users MODIFY birthDate date NOT NULL`,
      );
    }

    if (await queryRunner.hasColumn('date_requests', 'windowStartAt')) {
      await queryRunner.query(`
        UPDATE date_requests
        SET windowStartAt = COALESCE(windowStartAt, createdAt),
            windowEndAt = COALESCE(windowEndAt, DATE_ADD(createdAt, INTERVAL 2 HOUR)),
            expiresAt = COALESCE(expiresAt, DATE_ADD(createdAt, INTERVAL 2 HOUR))
        WHERE windowStartAt IS NULL OR windowEndAt IS NULL OR expiresAt IS NULL
      `);
      await queryRunner.query(
        `ALTER TABLE date_requests MODIFY windowStartAt datetime NOT NULL, MODIFY windowEndAt datetime NOT NULL, MODIFY expiresAt datetime NOT NULL`,
      );
    }

    if (!(await queryRunner.hasColumn('meetup_feedback', 'vibeRating'))) {
      await queryRunner.addColumn(
        'meetup_feedback',
        new TableColumn({
          name: 'vibeRating',
          type: 'int',
          isNullable: false,
          default: 3,
        }),
      );
    }
    await queryRunner.query(
      `ALTER TABLE meetup_feedback MODIFY vibeRating int NOT NULL`,
    );

    const feedbackTable = await queryRunner.getTable('meetup_feedback');
    const meetAgainColumn = feedbackTable?.findColumnByName('wouldMeetAgain');
    if (meetAgainColumn && meetAgainColumn.type !== 'varchar') {
      await queryRunner.query(
        `ALTER TABLE meetup_feedback MODIFY wouldMeetAgain varchar(5) NOT NULL`,
      );
      await queryRunner.query(`
        UPDATE meetup_feedback
        SET wouldMeetAgain = CASE WHEN wouldMeetAgain = '1' THEN 'YES' ELSE 'NO' END
      `);
    }

    if (!(await queryRunner.hasColumn('meetup_feedback', 'tags'))) {
      await queryRunner.addColumn(
        'meetup_feedback',
        new TableColumn({ name: 'tags', type: 'json', isNullable: true }),
      );
      await queryRunner.query(
        `UPDATE meetup_feedback SET tags = JSON_ARRAY() WHERE tags IS NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE meetup_feedback MODIFY tags json NOT NULL`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('meetup_feedback', 'tags')) {
      await queryRunner.dropColumn('meetup_feedback', 'tags');
    }
    if (await queryRunner.hasColumn('meetup_feedback', 'vibeRating')) {
      await queryRunner.dropColumn('meetup_feedback', 'vibeRating');
    }
    if (await queryRunner.hasColumn('meetup_feedback', 'wouldMeetAgain')) {
      await queryRunner.query(`
        UPDATE meetup_feedback
        SET wouldMeetAgain = CASE WHEN wouldMeetAgain = 'YES' THEN '1' ELSE '0' END
      `);
      await queryRunner.query(
        `ALTER TABLE meetup_feedback MODIFY wouldMeetAgain tinyint NOT NULL`,
      );
    }
    await queryRunner.query(`ALTER TABLE users MODIFY birthDate date NULL`);
    await queryRunner.query(
      `ALTER TABLE date_requests MODIFY windowStartAt datetime NULL, MODIFY windowEndAt datetime NULL, MODIFY expiresAt datetime NULL`,
    );
  }
}
