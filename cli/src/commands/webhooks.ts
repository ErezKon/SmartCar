import { Command } from 'commander';
import chalk from 'chalk';
import { api, handleApiError } from '../utils/api-client';
import { heading, keyValue, table, success, json } from '../utils/formatters';

async function prompt(questions: any[]): Promise<any> {
  const inquirer = (await import('inquirer')).default;
  return inquirer.prompt(questions);
}

export function registerWebhooksCommands(program: Command): void {
  const webhooks = program
    .command('webhooks')
    .description('Webhook management');

  webhooks
    .command('list')
    .description('List configured webhooks')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
      try {
        const { data } = await api.get('/api/webhooks');
        if (opts.json) {
          json(data);
          return;
        }
        heading('Webhooks');
        const items = data.data || data;
        if (!items || (Array.isArray(items) && items.length === 0)) {
          console.log(chalk.gray('\n  No webhooks configured.'));
          return;
        }
        if (Array.isArray(items)) {
          const rows = items.map((w: any) => [
            w.id || w.webhookId,
            w.attributes?.callbackUrl || w.callbackUrl || 'N/A',
            w.attributes?.status || w.status || 'N/A',
          ]);
          table(['Webhook ID', 'Callback URL', 'Status'], rows);
        } else {
          json(items);
        }
      } catch (err) {
        handleApiError(err);
      }
    });

  webhooks
    .command('get <webhookId>')
    .description('Get webhook details')
    .option('--json', 'Output raw JSON')
    .action(async (webhookId, opts) => {
      try {
        const { data } = await api.get(`/api/webhooks/${webhookId}`);
        if (opts.json) {
          json(data);
          return;
        }
        heading('Webhook Details');
        const wh = data.data || data;
        const attrs = wh.attributes || wh;
        keyValue({
          'Webhook ID': wh.id || webhookId,
          'Callback URL': attrs.callbackUrl,
          'Status': attrs.status,
          'Created': attrs.createdAt,
        });
      } catch (err) {
        handleApiError(err);
      }
    });

  webhooks
    .command('events')
    .description('Show recent webhook events from local log')
    .option('--limit <n>', 'Number of events', '20')
    .option('--offset <n>', 'Offset', '0')
    .option('--type <eventType>', 'Filter by event type')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
      try {
        const query: Record<string, string | number> = {
          limit: opts.limit,
          offset: opts.offset,
        };
        if (opts.type) query.eventType = opts.type;

        const { data } = await api.get('/api/webhook-events', { query });
        if (opts.json) {
          json(data);
          return;
        }
        heading('Webhook Events');
        const events = data.data || data;
        if (!events || events.length === 0) {
          console.log(chalk.gray('\n  No webhook events recorded.'));
          return;
        }
        const rows = events.map((e: any) => [
          e.event_id || e.eventId || e.id,
          e.event_type || e.eventType,
          e.vehicle_id || e.vehicleId || 'N/A',
          e.received_at || e.receivedAt || 'N/A',
        ]);
        table(['Event ID', 'Type', 'Vehicle ID', 'Received'], rows);
      } catch (err) {
        handleApiError(err);
      }
    });

  const subscriptions = program
    .command('subscriptions')
    .description('Webhook subscription management');

  subscriptions
    .command('list')
    .description('List webhook subscriptions')
    .option('--webhook-id <webhookId>', 'Filter by webhook ID')
    .option('--vehicle-id <vehicleId>', 'Filter by vehicle ID')
    .option('--user-id <userId>', 'Filter by user ID')
    .option('--page <n>', 'Page number')
    .option('--size <n>', 'Page size')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
      try {
        const query: Record<string, string | number> = {};
        if (opts.webhookId) query.webhookId = opts.webhookId;
        if (opts.vehicleId) query.vehicleId = opts.vehicleId;
        if (opts.userId) query.userId = opts.userId;
        if (opts.page) query.page = opts.page;
        if (opts.size) query.size = opts.size;

        const { data } = await api.get('/api/subscriptions', { query });
        if (opts.json) {
          json(data);
          return;
        }
        heading('Subscriptions');
        const items = data.data || data;
        if (!items || (Array.isArray(items) && items.length === 0)) {
          console.log(chalk.gray('\n  No subscriptions found.'));
          return;
        }
        if (Array.isArray(items)) {
          const rows = items.map((s: any) => [
            s.id || s.subscriptionId,
            s.attributes?.webhookId || s.webhookId || 'N/A',
            s.attributes?.vehicleId || s.vehicleId || 'N/A',
            s.attributes?.userId || s.userId || 'N/A',
          ]);
          table(['Subscription ID', 'Webhook ID', 'Vehicle ID', 'User ID'], rows);
        } else {
          json(items);
        }
      } catch (err) {
        handleApiError(err);
      }
    });

  subscriptions
    .command('create')
    .description('Create a webhook subscription (interactive)')
    .action(async () => {
      try {
        const answers = await prompt([
          {
            type: 'input',
            name: 'webhookId',
            message: 'Webhook ID:',
            validate: (v: string) => v.length > 0 || 'Webhook ID is required',
          },
          {
            type: 'input',
            name: 'userId',
            message: 'User ID:',
            validate: (v: string) => v.length > 0 || 'User ID is required',
          },
          {
            type: 'input',
            name: 'vehicleId',
            message: 'Vehicle ID:',
            validate: (v: string) => v.length > 0 || 'Vehicle ID is required',
          },
        ]);

        const { data } = await api.post('/api/subscriptions', {
          webhookId: answers.webhookId,
          userId: answers.userId,
          vehicleId: answers.vehicleId,
        });
        heading('Subscription Created');
        const sub = data.data || data;
        keyValue({
          'Subscription ID': sub.id || sub.subscriptionId,
          'Webhook ID': sub.attributes?.webhookId || answers.webhookId,
          'User ID': sub.attributes?.userId || answers.userId,
          'Vehicle ID': sub.attributes?.vehicleId || answers.vehicleId,
        });
      } catch (err) {
        handleApiError(err);
      }
    });

  subscriptions
    .command('get <subscriptionId>')
    .description('Get subscription details')
    .option('--json', 'Output raw JSON')
    .action(async (subscriptionId, opts) => {
      try {
        const { data } = await api.get(`/api/subscriptions/${subscriptionId}`);
        if (opts.json) {
          json(data);
          return;
        }
        heading('Subscription Details');
        const sub = data.data || data;
        const attrs = sub.attributes || sub;
        keyValue({
          'Subscription ID': sub.id || subscriptionId,
          'Webhook ID': attrs.webhookId,
          'User ID': attrs.userId,
          'Vehicle ID': attrs.vehicleId,
          'Created': attrs.createdAt,
        });
      } catch (err) {
        handleApiError(err);
      }
    });

  subscriptions
    .command('remove <subscriptionId>')
    .description('Remove a subscription')
    .action(async (subscriptionId) => {
      try {
        await api.delete(`/api/subscriptions/${subscriptionId}`);
        success(`Subscription ${subscriptionId} removed successfully.`);
      } catch (err) {
        handleApiError(err);
      }
    });
}
