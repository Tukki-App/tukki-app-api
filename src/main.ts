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

  // Health check — utilisé par Docker HEALTHCHECK et le CD
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const config = new DocumentBuilder()
    .setTitle('Covoiturage API')
    .setDescription(
      `## API de covoiturage — Sénégal\n\n` +
      `### Authentification\n` +
      `Tous les endpoints protégés nécessitent un **Bearer Token JWT** dans le header :\n` +
      `\`Authorization: Bearer <token>\`\n\n` +
      `Obtenez votre token via \`POST /auth/login\`.\n\n` +
      `### Rôles\n` +
      `- **PASSENGER** — peut rechercher des trajets, créer des réservations, consulter ses réservations\n` +
      `- **DRIVER** — peut créer des trajets, gérer les réservations de ses trajets, mettre à jour sa disponibilité\n\n` +
      `### Format téléphone\n` +
      `Tous les numéros doivent être au format sénégalais : \`+221XXXXXXXXX\` (ex: \`+221700000001\`)\n\n` +
      `### Pagination\n` +
      `La recherche de trajets utilise une pagination par curseur. Passez le \`nextCursor\` reçu dans la réponse pour obtenir la page suivante.`
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token JWT obtenu via POST /auth/login' },
      'JWT',
    )
    .addTag('Auth', 'Inscription et connexion des utilisateurs')
    .addTag('Identity', 'Gestion du profil et disponibilité chauffeur')
    .addTag('Trips', 'Création et recherche de trajets')
    .addTag('Bookings', 'Réservations de trajets')
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
