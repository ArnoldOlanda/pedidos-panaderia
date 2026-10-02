import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitProducts1700000002000 implements MigrationInterface {
  name = 'InitProducts1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "recipeId" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "price" float NOT NULL,
        "availableDate" date NOT NULL,
        "closesAt" TIMESTAMP NOT NULL,
        "closed" boolean NOT NULL DEFAULT false,
        "createdById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_products_recipeId" FOREIGN KEY ("recipeId")
          REFERENCES "recipes"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_products_createdById" FOREIGN KEY ("createdById")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_availableDate" ON "products" ("availableDate")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_recipeId" ON "products" ("recipeId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_createdById" ON "products" ("createdById")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_closesAt" ON "products" ("closesAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_closesAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_createdById"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_recipeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_availableDate"`);
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "products" DROP CONSTRAINT IF EXISTS "FK_products_createdById"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "products" DROP CONSTRAINT IF EXISTS "FK_products_recipeId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
  }
}