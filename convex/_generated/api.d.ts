/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as check_exams from "../check_exams.js";
import type * as debug from "../debug.js";
import type * as diagnostics from "../diagnostics.js";
import type * as exams from "../exams.js";
import type * as fix_credibility from "../fix_credibility.js";
import type * as institutes from "../institutes.js";
import type * as invites from "../invites.js";
import type * as migrationHelper from "../migrationHelper.js";
import type * as migrations from "../migrations.js";
import type * as monitoring from "../monitoring.js";
import type * as notifications from "../notifications.js";
import type * as notificationsSimple from "../notificationsSimple.js";
import type * as policies from "../policies.js";
import type * as seed from "../seed.js";
import type * as sessions from "../sessions.js";
import type * as sessionsSimple from "../sessionsSimple.js";
import type * as users from "../users.js";
import type * as violations from "../violations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  audit: typeof audit;
  auth: typeof auth;
  check_exams: typeof check_exams;
  debug: typeof debug;
  diagnostics: typeof diagnostics;
  exams: typeof exams;
  fix_credibility: typeof fix_credibility;
  institutes: typeof institutes;
  invites: typeof invites;
  migrationHelper: typeof migrationHelper;
  migrations: typeof migrations;
  monitoring: typeof monitoring;
  notifications: typeof notifications;
  notificationsSimple: typeof notificationsSimple;
  policies: typeof policies;
  seed: typeof seed;
  sessions: typeof sessions;
  sessionsSimple: typeof sessionsSimple;
  users: typeof users;
  violations: typeof violations;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
