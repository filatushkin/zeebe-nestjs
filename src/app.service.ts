import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class AppService {

  getHello(): string {
    return 'This is Zeebe NestJS service!';
  }

}
