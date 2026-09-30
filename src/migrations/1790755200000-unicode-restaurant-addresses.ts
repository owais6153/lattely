import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnicodeRestaurantAddresses1790755200000
  implements MigrationInterface
{
  name = 'UnicodeRestaurantAddresses1790755200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE date_requests
        DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        MODIFY acceptedRestaurantName varchar(200)
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
        MODIFY acceptedRestaurantAddress varchar(300)
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL
    `);
  }

  async down(): Promise<void> {
    // Intentionally irreversible: downgrading can corrupt multilingual data.
  }
}
