import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class MultipleProposedTimes1725754100000
  implements MigrationInterface
{
  name = 'MultipleProposedTimes1725754100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('date_requests', 'proposedTimeSlots'))) {
      await queryRunner.addColumn(
        'date_requests',
        new TableColumn({
          name: 'proposedTimeSlots',
          type: 'json',
          isNullable: true,
        }),
      );
    }
    if (!(await queryRunner.hasColumn('date_requests', 'selectedTimeSlotId'))) {
      await queryRunner.addColumn(
        'date_requests',
        new TableColumn({
          name: 'selectedTimeSlotId',
          type: 'varchar',
          length: '36',
          isNullable: true,
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('date_requests', 'selectedTimeSlotId')) {
      await queryRunner.dropColumn('date_requests', 'selectedTimeSlotId');
    }
    if (await queryRunner.hasColumn('date_requests', 'proposedTimeSlots')) {
      await queryRunner.dropColumn('date_requests', 'proposedTimeSlots');
    }
  }
}
