import { Module } from '@nestjs/common';
import { ZeebeModule, ZeebeServer } from 'nestjs-zeebe';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ 
    ZeebeModule.forRoot({ gatewayAddress: 'localhost:26500' })
  ],
  controllers: [AppController],
  providers: [ZeebeServer,AppService],
})
export class AppModule {}
