import { INestApplication, ValidationPipe } from '@nestjs/common';

/** Shared between main.ts and e2e tests so both run with identical pipes. */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
