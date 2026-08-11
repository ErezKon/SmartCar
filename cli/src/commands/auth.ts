import { Command } from 'commander';
import chalk from 'chalk';
import { api, handleApiError } from '../utils/api-client';
import { heading, keyValue, success } from '../utils/formatters';

export function registerAuthCommands(program: Command): void {
  const auth = program
    .command('auth')
    .description('Authentication and connection management');

  auth
    .command('status')
    .description('Show current authentication status')
    .action(async () => {
      try {
        const { data } = await api.get('/auth/status');
        heading('Authentication Status');
        keyValue({
          'Has Token': data.token?.hasToken ?? false,
          'Expires At': data.token?.expiresAt ?? null,
          'Remaining (s)': data.token?.remainingSeconds ?? null,
          'Connected Users': data.connectedUsers ?? 0,
        });
        if (data.users && data.users.length > 0) {
          console.log(chalk.bold('\n  Connected Users:'));
          for (const user of data.users) {
            console.log(chalk.white(`    - ${user.user_id || user.userId}`) +
              (user.external_id ? chalk.gray(` (${user.external_id})`) : ''));
          }
        }
      } catch (err) {
        handleApiError(err);
      }
    });

  auth
    .command('connect')
    .description('Open Smartcar Connect to authorize a vehicle')
    .option('--mode <mode>', 'Connection mode (simulated or live)', 'simulated')
    .option('--make <make>', 'Filter by vehicle make')
    .option('--single', 'Single vehicle selection mode')
    .action(async (opts) => {
      try {
        const query: Record<string, string> = {};
        if (opts.mode) query.mode = opts.mode;
        if (opts.make) query.make = opts.make;
        if (opts.single) query.single_select = 'true';

        heading('Smartcar Connect');
        const baseUrl = process.env.SMARTCAR_API_URL || 'http://localhost:3000';
        const params = new URLSearchParams(query).toString();
        const connectUrl = `${baseUrl}/auth/connect${params ? '?' + params : ''}`;
        console.log(chalk.white('\n  Open this URL in your browser to connect a vehicle:\n'));
        console.log(chalk.bold.underline.blue(`  ${connectUrl}\n`));
      } catch (err) {
        handleApiError(err);
      }
    });

  auth
    .command('token')
    .description('Show current token info')
    .option('--refresh', 'Force a token refresh')
    .action(async (opts) => {
      try {
        if (opts.refresh) {
          const { data } = await api.post('/auth/token');
          heading('Token Refreshed');
          keyValue({
            'Has Token': data.hasToken ?? false,
            'Expires At': data.expiresAt ?? null,
            'Remaining (s)': data.remainingSeconds ?? null,
          });
        } else {
          const { data } = await api.get('/auth/token');
          heading('Token Info');
          keyValue({
            'Has Token': data.hasToken ?? false,
            'Expires At': data.expiresAt ?? null,
            'Remaining (s)': data.remainingSeconds ?? null,
          });
        }
      } catch (err) {
        handleApiError(err);
      }
    });
}
