import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { VotersModule } from './modules/voters/voters.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { EventsModule } from './modules/events/events.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { DistrictsModule } from './modules/districts/districts.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { MapsModule } from './modules/maps/maps.module';
import { HealthModule } from './modules/health/health.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { SentryModule } from './modules/sentry';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { AdminUsersModule } from './modules/admin/users/admin-users.module';
import { AdminSubscriptionsModule } from './modules/admin/subscriptions/admin-subscriptions.module';
import { AdminPaymentsModule } from './modules/admin/payments/admin-payments.module';
import { AdminAnalyticsModule } from './modules/admin/analytics/admin-analytics.module';
import { AdminReferralsModule } from './modules/admin/referrals/admin-referrals.module';
import { AdminPlansModule } from './modules/admin/plans/admin-plans.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AdminDataRetentionModule } from './modules/admin/data-retention/admin-data-retention.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,   // 1 minute
        limit: 100,   // 100 requests per minute
      },
    ]),

    // Error monitoring
    SentryModule.forRoot(),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    CampaignsModule,
    VotersModule,
    ContactsModule,
    EventsModule,
    SchedulesModule,
    DistrictsModule,
    AnalysisModule,
    MapsModule,
    HealthModule,
    CalendarModule,
    SubscriptionsModule,
    PaymentsModule,
    ReferralsModule,
    AdminAuthModule,
    AdminUsersModule,
    AdminSubscriptionsModule,
    AdminPaymentsModule,
    AdminAnalyticsModule,
    AdminReferralsModule,
    AdminPlansModule,
    TasksModule,
    AdminDataRetentionModule,
  ],
})
export class AppModule {}
