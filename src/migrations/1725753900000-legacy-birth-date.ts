import { MigrationInterface, QueryRunner } from 'typeorm';

export class LegacyBirthDate1725753900000 implements MigrationInterface {
  name = 'LegacyBirthDate1725753900000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users MODIFY birthDate date NULL`);
    await queryRunner.query(
      `UPDATE users SET birthDate = NULL WHERE birthDate = '1970-01-01'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE users SET birthDate = '1970-01-01' WHERE birthDate IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE users MODIFY birthDate date NOT NULL`,
    );
  }
}
