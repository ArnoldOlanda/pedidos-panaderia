import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitRecipes1700000001000 implements MigrationInterface {
  name = 'InitRecipes1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "recipes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(200) NOT NULL,
        "ingredients" jsonb NOT NULL,
        "utilidad" float NOT NULL DEFAULT 35,
        "totalCost" float NOT NULL,
        "suggestedPrice" float NOT NULL,
        "createdById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recipes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recipes_createdById" FOREIGN KEY ("createdById")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_recipes_name" ON "recipes" ("name")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_recipes_createdById" ON "recipes" ("createdById")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_recipes_createdById"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_recipes_name"`);
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "recipes" DROP CONSTRAINT IF EXISTS "FK_recipes_createdById"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "recipes"`);
  }
}
