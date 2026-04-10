import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminRole1680000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Supprimer l'ancienne contrainte et en créer une nouvelle avec ADMIN
    await queryRunner.query(`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_role_check
    `);
    await queryRunner.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('PASSENGER', 'DRIVER', 'ADMIN'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    await queryRunner.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('PASSENGER', 'DRIVER'))
    `);
  }
}
