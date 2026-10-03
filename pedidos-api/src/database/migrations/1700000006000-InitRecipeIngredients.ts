import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitRecipeIngredients1700000006000 implements MigrationInterface {
  name = 'InitRecipeIngredients1700000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "recipe_ingredients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "recipeId" uuid NOT NULL,
        "ingredientId" uuid NOT NULL,
        "quantityUsed" float NOT NULL,
        "position" int NOT NULL,
        CONSTRAINT "PK_recipe_ingredients_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recipe_ingredients_recipe" FOREIGN KEY ("recipeId")
          REFERENCES "recipes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_recipe_ingredients_ingredient" FOREIGN KEY ("ingredientId")
          REFERENCES "ingredients"("id") ON DELETE RESTRICT,
        CONSTRAINT "UQ_recipe_ingredients_recipe_ingredient" UNIQUE ("recipeId", "ingredientId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_recipe_ingredients_recipe" ON "recipe_ingredients" ("recipeId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_recipe_ingredients_ingredient" ON "recipe_ingredients" ("ingredientId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_recipe_ingredients_ingredient"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_recipe_ingredients_recipe"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "recipe_ingredients" DROP CONSTRAINT IF EXISTS "UQ_recipe_ingredients_recipe_ingredient"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "recipe_ingredients"`);
  }
}
