import { Module } from '@nestjs/common';
import { HealthController } from './app.controller';

@Module({
  imports: [],
  controllers: [HealthController],
})
export class AppModule {}