import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { AppCacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.register({
      ttl: 60000, // ms en v5+
      max: 100,
    }),
  ],
  providers: [AppCacheService],
  exports: [AppCacheService, NestCacheModule],
})
export class AppCacheModule {}
