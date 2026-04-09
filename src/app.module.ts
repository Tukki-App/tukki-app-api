import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripModule } from './domains/trip';
import { BookingModule } from './domains/booking';
import { AuthModule } from './domains/auth';
import { IdentityModule } from './domains/identity';
import { InterfacesModule } from './interfaces/interfaces.module';
import { AppCacheModule } from './infrastructure/cache/cache.module';
import { DatabaseModule } from './infrastructure/db/database.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    }),
    IdentityModule,
    TripModule,
    BookingModule,
    AuthModule,
    AppCacheModule,
    DatabaseModule,
    InterfacesModule,
  ],
})
export class AppModule {}