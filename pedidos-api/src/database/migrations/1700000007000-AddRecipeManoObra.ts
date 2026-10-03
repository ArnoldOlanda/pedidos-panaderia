import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecipeManoObra1700000007000 implements MigrationInterface {
  name = 'AddRecipeManoObra1700000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The DEFAULT 20 backfills existing rows with the exact labor percentage
    // they were priced with, so their persisted totalCost/suggestedPrice stay
    // coherent and nothing is recalculated.
    await queryRunner.query(
      `ALTER TABLE "recipes" ADD "manoObra" float NOT NULL DEFAULT 20`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipes" ALTER COLUMN "utilidad" SET DEFAULT 100`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recipes" ALTER COLUMN "utilidad" SET DEFAULT 35`,
    );
    await queryRunner.query(`ALTER TABLE "recipes" DROP COLUMN "manoObra"`);
  }
}
