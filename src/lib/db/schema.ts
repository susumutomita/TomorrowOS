import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  real,
  date,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

// --- NextAuth required tables ---

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  timezone: text('timezone').default('Asia/Tokyo').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);

// --- Domain models ---

export const taskStatusEnum = pgEnum('task_status', [
  'PENDING',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const priorityEnum = pgEnum('priority', [
  'URGENT',
  'HIGH',
  'MEDIUM',
  'LOW',
]);

export const sourceTypeEnum = pgEnum('source_type', [
  'CALENDAR',
  'MANUAL',
  'SLACK',
]);

export const scheduleStatusEnum = pgEnum('schedule_status', [
  'DRAFT',
  'CONFIRMED',
  'NOTIFIED',
]);

export const calendarEvents = pgTable(
  'calendar_event',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    googleEventId: text('google_event_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    startTime: timestamp('start_time', { mode: 'date' }).notNull(),
    endTime: timestamp('end_time', { mode: 'date' }).notNull(),
    location: text('location'),
    isAllDay: boolean('is_all_day').default(false).notNull(),
    status: text('status').default('confirmed').notNull(),
    calendarId: text('calendar_id').notNull(),
    lastSyncedAt: timestamp('last_synced_at', { mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('calendar_event_user_google_idx').on(
      table.userId,
      table.googleEventId
    ),
    index('calendar_event_user_time_idx').on(
      table.userId,
      table.startTime,
      table.endTime
    ),
  ]
);

export const tasks = pgTable(
  'task',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: taskStatusEnum('status').default('PENDING').notNull(),
    priority: priorityEnum('priority').default('MEDIUM').notNull(),
    estimatedMinutes: integer('estimated_minutes'),
    dueDate: timestamp('due_date', { mode: 'date' }),
    sourceEventId: text('source_event_id').references(() => calendarEvents.id),
    sourceType: sourceTypeEnum('source_type').default('MANUAL').notNull(),
    aiConfidence: real('ai_confidence'),
    aiReasoning: text('ai_reasoning'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('task_user_status_due_idx').on(
      table.userId,
      table.status,
      table.dueDate
    ),
  ]
);

export const schedules = pgTable(
  'schedule',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    status: scheduleStatusEnum('status').default('DRAFT').notNull(),
    notifiedAt: timestamp('notified_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('schedule_user_date_idx').on(table.userId, table.date),
    index('schedule_user_date_lookup_idx').on(table.userId, table.date),
  ]
);

export const scheduleSlots = pgTable(
  'schedule_slot',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    scheduleId: text('schedule_id')
      .notNull()
      .references(() => schedules.id, { onDelete: 'cascade' }),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    startTime: timestamp('start_time', { mode: 'date' }).notNull(),
    endTime: timestamp('end_time', { mode: 'date' }).notNull(),
    order: integer('order').notNull(),
  },
  (table) => [
    index('schedule_slot_schedule_order_idx').on(table.scheduleId, table.order),
  ]
);

export const slackConfigs = pgTable('slack_config', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  webhookUrl: text('webhook_url').notNull(),
  channel: text('channel'),
  notifyTime: text('notify_time').default('21:00').notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
});
