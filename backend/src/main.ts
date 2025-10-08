import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const config = new DocumentBuilder()
    .setTitle('Elevator Simulation API')
    .setDescription(
      'Backend for multi-elevator simulation (REST + WS). State is in-memory with periodic JSON snapshots.',
    )
    .setVersion('1.0.0')
    .addTag('Elevator', 'Elevator control & state')
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc);

  await app.listen(3000);
}
void bootstrap();
