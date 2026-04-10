import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  phone!: string;

  @Column({ nullable: true })
  name!: string;

  @Column({ select: false, nullable: true })
  @Exclude()
  password?: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  role!: 'PASSENGER' | 'DRIVER' | 'ADMIN';

  @Column({ default: false, name: 'is_verified' })
  isVerified!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt!: Date;
}
