import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitPushSubscriptions1700000004000 implements MigrationInterface {
  name = 'InitPushSubscriptions1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "push_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "endpoint" text NOT NULL,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_subscriptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_push_subscriptions_endpoint" UNIQUE ("endpoint"),
        CONSTRAINT "FK_push_subscriptions_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_push_subscriptions_userId" ON "push_subscriptions" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_push_subscriptions_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "push_subscriptions" DROP CONSTRAINT IF EXISTS "FK_push_subscriptions_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "push_subscriptions" DROP CONSTRAINT IF EXISTS "UQ_push_subscriptions_endpoint"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "push_subscriptions"`);
  }
}