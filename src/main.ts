import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const config = new DocumentBuilder()
    .setTitle('Covoiturage API')
    .setDescription('API de covoiturage — Sénégal. Authentification via Bearer JWT (obtenu sur POST /auth/login). Numéros au format +221XXXXXXXXX.')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token JWT obtenu via POST /auth/login' },
      'JWT',
    )
    .addTag('Auth', 'Connexion et inscription')
    .addTag('Identity', 'Profil utilisateur et disponibilité chauffeur')
    .addTag('Trips', 'Création et recherche de trajets')
    .addTag('Bookings', 'Réservations')
    .addTag('Upload', 'Upload d\'images via Cloudinary')
    .addTag('Admin', 'Back office — gestion et statistiques (ADMIN uniquement)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
