import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type UserRole = 'VENDEDOR';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 8, unique: true })
  dni!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  // Vestigial: the product only has one user kind (vendor). Buyers are
  // anonymous and their data lives as a snapshot on each order. The DB enum
  // still carries the historic 'COMPRADOR' value (no migration was run);
  // synchronize:false means TypeORM never reconciles the two.
  @Column({
    type: 'enum',
    enum: ['VENDEDOR'],
    default: 'VENDEDOR',
  })
  role!: UserRole;

  @Column({ type: 'jsonb', nullable: true })
  pushSub!: object | null;

  @CreateDateColumn()
  createdAt!: Date;
}
