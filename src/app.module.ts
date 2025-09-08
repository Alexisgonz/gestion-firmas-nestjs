import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MondayModule } from './monday/monday.module';
import { HttpModule } from '@nestjs/axios';
import { DocumentModule } from './document/document.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
      httpsAgent: new (require('https')).Agent({
        rejectUnauthorized: false
      }),
    }),
    MondayModule,
    DocumentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
