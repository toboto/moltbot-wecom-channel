/**
 * Session context management using AsyncLocalStorage
 * This approach works across module boundaries and async calls
 */

import { AsyncLocalStorage } from "node:async_hooks";

interface SessionContext {
  userId: string;
  accountId: string;
}

const asyncLocalStorage = new AsyncLocalStorage<SessionContext>();

/**
 * Run code within a session context
 */
export function runInSessionContext<T>(
  userId: string,
  accountId: string,
  callback: () => T,
  verbose = false
): T {
  const context: SessionContext = { userId, accountId };
  if (verbose) {
    console.log(`[Session Context] 🔧 设置会话上下文: userId=${userId}, accountId=${accountId}`);
  }
  return asyncLocalStorage.run(context, callback);
}

/**
 * Get the current session's user ID
 */
export function getCurrentUserId(verbose = false): string | null {
  const context = asyncLocalStorage.getStore();

  if (context) {
    if (verbose) {
      console.log(`[Session Context] ✅ 获取当前用户: ${context.userId}`);
    }
    return context.userId;
  }

  if (verbose) {
    console.log(`[Session Context] ❌ 无会话上下文`);
  }
  return null;
}
