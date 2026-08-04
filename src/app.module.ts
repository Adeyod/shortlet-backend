import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './common/config/configuration';
import { MailModule } from './mail/mail.module';
import { ApartmentUnitModule } from './modules/apartment-unit/apartment-unit.module';
import { ApartmentModule } from './modules/apartment/apartment.module';
import { AuthModule } from './modules/auth/auth.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { BookingModule } from './modules/booking/booking.module';
import { PaymentGatewayModule } from './modules/payment-gateway/payment-gateway.module';
import { PaymentModule } from './modules/payment/payment.module';
import { RefreshTokensModule } from './modules/refresh-tokens/refresh-tokens.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { UsersModule } from './modules/users/users.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        JWT_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        MONGO_URI: Joi.string().required(),
      }),
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGO_URI'),

        maxPoolSize: 20,
        minPoolSize: 5,

        connectionFactory: (connection) => {
          if (connection.readyState === 1) {
            console.log(`MongoDB connected to database: ${connection.name}`);
          }

          connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected...');
          });

          connection.on('error', (error) => {
            console.error('MongoDB connection error:', error);
          });

          connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
          });

          return connection;
        },
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (redisUrl) {
          const redisArray = redisUrl.split(':');

          const url = new URL(redisUrl);
          return {
            redis: {
              host: url.hostname,
              port: Number(url.port),
              maxRetriesPerRequest: null,
            },
          };
        }

        return {
          redis: {
            host: '127.0.0.1',
            port: 6379,
          },
        };
      },
    }),

    AuthModule,
    MailModule,
    EventEmitterModule.forRoot(),
    UsersModule,
    RefreshTokensModule,
    TokensModule,
    ApartmentModule,
    ApartmentUnitModule,
    AvailabilityModule,
    BookingModule,
    PaymentModule,
    PaymentGatewayModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
