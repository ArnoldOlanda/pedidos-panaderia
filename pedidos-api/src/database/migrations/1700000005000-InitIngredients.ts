import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitIngredients1700000005000 implements MigrationInterface {
  name = 'InitIngredients1700000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "ingredient_unit_enum" AS ENUM ('G','KG','ML','L','UNIT')`,
    );
    await queryRunner.query(`
      CREATE TABLE "ingredients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(150) NOT NULL,
        "usageUnit" "ingredient_unit_enum" NOT NULL,
        "purchaseUnit" "ingredient_unit_enum" NOT NULL,
        "conversionFactor" float NOT NULL,
        "purchasePrice" float NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ingredients_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_ingredients_name" ON "ingredients" ("name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_ingredients_name"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ingredients"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ingredient_unit_enum"`);
  }
}
