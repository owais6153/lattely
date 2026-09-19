import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class StagedOnboarding1725754000000 implements MigrationInterface {
  name = 'StagedOnboarding1725754000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE users MODIFY gender varchar(20) NULL, MODIFY firstName varchar(60) NULL, MODIFY lastName varchar(60) NULL',
    );

    if (!(await queryRunner.hasColumn('users', 'interests'))) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({ name: 'interests', type: 'json', isNullable: true }),
      );
    }
    if (!(await queryRunner.hasColumn('users', 'coffeeAvailability'))) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'coffeeAvailability',
          type: 'json',
          isNullable: true,
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('users', 'coffeeAvailability')) {
      await queryRunner.dropColumn('users', 'coffeeAvailability');
    }
    if (await queryRunner.hasColumn('users', 'interests')) {
      await queryRunner.dropColumn('users', 'interests');
    }
    await queryRunner.query(
      "UPDATE users SET gender = COALESCE(gender, 'NON_BINARY'), firstName = COALESCE(firstName, ''), lastName = COALESCE(lastName, '')",
    );
    await queryRunner.query(
      "ALTER TABLE users MODIFY gender varchar(10) NOT NULL DEFAULT 'NON_BINARY', MODIFY firstName varchar(60) NOT NULL, MODIFY lastName varchar(60) NOT NULL",
    );
  }
}
