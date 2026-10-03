import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitOrders1700000003000 implements MigrationInterface {
  name = 'InitOrders1700000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "orders_status_enum" AS ENUM ('PENDIENTE', 'LISTO', 'ENTREGADO')
    `);
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "productId" uuid NOT NULL,
        "buyerDni" varchar(8) NOT NULL,
        "buyerName" varchar(120) NOT NULL,
        "buyerApellidos" varchar(120) NOT NULL,
        "buyerCarrera" varchar(120) NOT NULL,
        "buyerDeviceId" uuid NOT NULL,
        "quantity" int NOT NULL,
        "status" "orders_status_enum" NOT NULL DEFAULT 'PENDIENTE',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_orders_productId" FOREIGN KEY ("productId")
          REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_orders_quantity_positive" CHECK ("quantity" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_productId" ON "orders" ("productId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_buyerDni" ON "orders" ("buyerDni")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_status" ON "orders" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_buyerDni"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_productId"`);
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "orders" DROP CONSTRAINT IF EXISTS "FK_orders_productId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "orders_status_enum"`);
  }
}