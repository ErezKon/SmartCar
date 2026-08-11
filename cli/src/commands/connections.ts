import { Command } from 'commander';
import chalk from 'chalk';
import { api, handleApiError } from '../utils/api-client';
import { heading, keyValue, table, success } from '../utils/formatters';

export function registerConnectionsCommands(program: Command): void {
  const connections = program
    .command('connections')
    .description('Manage vehicle connections');

  connections
    .command('list')
    .description('List all vehicle connections')
    .option('--user-id <userId>', 'Filter by user ID')
    .option('--vehicle-id <vehicleId>', 'Filter by vehicle ID')
    .option('--mode <mode>', 'Filter by vehicle mode (simulated or live)')
    .option('--page <number>', 'Page number', '1')
    .option('--size <number>', 'Page size', '10')
    .action(async (opts) => {
      try {
        const query: Record<string, string | number> = {};
        if (opts.userId) query['filter[userId]'] = opts.userId;
        if (opts.vehicleId) query['filter[vehicleId]'] = opts.vehicleId;
        if (opts.mode) query['filter[vehicle.mode]'] = opts.mode;
        query['page[number]'] = opts.page;
        query['page[size]'] = opts.size;

        const { data } = await api.get('/api/connections', { query });
        heading('Connections');

        if (!data.data || data.data.length === 0) {
          console.log(chalk.gray('\n  No connections found.'));
          return;
        }

        const rows = data.data.map((conn: any) => [
          conn.id || conn.connectionId,
          conn.attributes?.userId || conn.userId || 'N/A',
          conn.attributes?.vehicleId || conn.vehicleId || 'N/A',
          conn.attributes?.vehicle?.mode || conn.mode || 'N/A',
        ]);
        table(['Connection ID', 'User ID', 'Vehicle ID', 'Mode'], rows);
      } catch (err) {
        handleApiError(err);
      }
    });

  connections
    .command('get <connectionId>')
    .description('Get details for a specific connection')
    .action(async (connectionId) => {
      try {
        const { data } = await api.get(`/api/connections/${connectionId}`);
        heading('Connection Details');
        const conn = data.data || data;
        keyValue({
          'Connection ID': conn.id || conn.connectionId,
          'User ID': conn.attributes?.userId || conn.userId,
          'Vehicle ID': conn.attributes?.vehicleId || conn.vehicleId,
          'Mode': conn.attributes?.vehicle?.mode || conn.mode,
          'Created': conn.attributes?.createdAt || conn.createdAt || conn.created_at,
        });
      } catch (err) {
        handleApiError(err);
      }
    });

  connections
    .command('remove <connectionId>')
    .description('Remove a connection')
    .action(async (connectionId) => {
      try {
        await api.delete(`/api/connections/${connectionId}`);
        success(`Connection ${connectionId} removed successfully.`);
      } catch (err) {
        handleApiError(err);
      }
    });

  connections
    .command('remove-user <userId>')
    .description('Remove a user and all their connections')
    .action(async (userId) => {
      try {
        await api.delete(`/api/connections/users/${userId}`);
        success(`User ${userId} and all connections removed.`);
      } catch (err) {
        handleApiError(err);
      }
    });
}
