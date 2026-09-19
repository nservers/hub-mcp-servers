import test from 'node:test';
import assert from 'node:assert';
import { MessageDispatcher } from '../dist/messaging/dispatcher.js';

test('MessageDispatcher operates in simulated mode when webhook URLs are not specified', async () => {
  const dispatcher = new MessageDispatcher({
    portHttp: 3000,
    hostHttp: '0.0.0.0',
    timeoutMs: 5000,
  });

  const slackRes = await dispatcher.sendSlack('Deployment completed successfully');
  assert.strictEqual(slackRes.delivered, true);
  assert.strictEqual(slackRes.simulated, true);
  assert.strictEqual(slackRes.destination, 'slack');

  const discordRes = await dispatcher.sendDiscord('Alert: High CPU usage on node');
  assert.strictEqual(discordRes.delivered, true);
  assert.strictEqual(discordRes.simulated, true);
  assert.strictEqual(discordRes.destination, 'discord');

  const connectivity = dispatcher.testConnectivity();
  assert.strictEqual(connectivity.status, 'ready');
  assert.strictEqual(connectivity.slackConfigured, false);
});
