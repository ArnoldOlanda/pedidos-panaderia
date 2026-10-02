import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type UserRole = 'VENDEDOR' | 'COMPRADOR';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 8, unique: true })
  dni!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({
    type: 'enum',
    enum: ['VENDEDOR', 'COMPRADOR'],
    default: 'COMPRADOR',
  })
  role!: UserRole;

  @Column({ type: 'jsonb', nullable: true })
  pushSub!: object | null;

  @CreateDateColumn()
  createdAt!: Date;
}
