import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitPushSubscriptions1700000004000 implements MigrationInterface {
  name = 'InitPushSubscriptions1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "push_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "deviceId" varchar(64) NOT NULL,
        "endpoint" text NOT NULL,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_subscriptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_push_subscriptions_endpoint" UNIQUE ("endpoint")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_push_subscriptions_deviceId" ON "push_subscriptions" ("deviceId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_push_subscriptions_deviceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "push_subscriptions" DROP CONSTRAINT IF EXISTS "UQ_push_subscriptions_endpoint"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "push_subscriptions"`);
  }
}