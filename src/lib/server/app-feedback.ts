import "server-only";
import { db } from "./db";

/* What testers send with "Feedback" in the service app, and the app's crash reports; both shown in /admin/service. */

export type Feedback = {
  id: number;
  userName: string;
  message: string;
  screen: string;
  hasScreenshot: boolean;
  appVersion: string;
  device: string;
  done: boolean;
  createdAt: string;
};

export type Crash = {
  id: number;
  appVersion: string;
  device: string;
  android: string;
  trace: string;
  createdAt: string;
};

type Row = Record<string, unknown>;

export async function listFeedback(limit = 50): Promise<Feedback[]> {
  const rows = (await db()`
    select id, user_name, message, screen, screenshot is not null as has_screenshot, app_version, device, done, created_at
    from app_feedback order by done, created_at desc limit ${limit}
  `) as Row[];
  return rows.map((row) => ({
    id: Number(row.id),
    userName: String(row.user_name),
    message: String(row.message),
    screen: String(row.screen),
    hasScreenshot: Boolean(row.has_screenshot),
    appVersion: String(row.app_version),
    device: String(row.device),
    done: Boolean(row.done),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));
}

export async function feedbackScreenshot(id: number) {
  const [row] = (await db()`select screenshot from app_feedback where id = ${id}`) as Row[];
  return row?.screenshot ? Buffer.from(String(row.screenshot), "base64") : null;
}

export async function setFeedbackDone(id: number, done: boolean) {
  await db()`update app_feedback set done = ${done} where id = ${id}`;
}

export async function listCrashes(limit = 10): Promise<Crash[]> {
  const rows = (await db()`select * from app_crashes order by created_at desc limit ${limit}`) as Row[];
  return rows.map((row) => ({
    id: Number(row.id),
    appVersion: String(row.app_version),
    device: String(row.device),
    android: String(row.android),
    trace: String(row.trace),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));
}
