import { ApiError, PlatformClient } from '../platform/client.js';

export function jsonResult(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

export function errorResult(message: string) {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  };
}

export function mapClientError(error: unknown, action: string) {
  if (error instanceof ApiError) {
    if (error.kind === 'approval_required') {
      return jsonResult({
        approval_required: true,
        reason: 'step_up',
        action,
        message: error.message,
        how_to_approve:
          'A human must generate a step-up token bound to this personal access token ' +
          '(POST /api/v1/auth/step-up with the account password and MFA code, or the ' +
          'nServers app approval flow) and retry this tool passing it as stepUpToken.',
      });
    }
    return errorResult(`[${error.kind}] ${action} failed: ${error.message}`);
  }
  return errorResult(`${action} failed: ${(error as Error)?.message || String(error)}`);
}

export async function runTool(
  client: PlatformClient,
  action: string,
  fn: () => Promise<unknown>
) {
  try {
    return jsonResult(await fn());
  } catch (error) {
    return mapClientError(error, action);
  }
}
