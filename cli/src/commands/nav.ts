import { Command } from 'commander';
import chalk from 'chalk';
import { api, handleApiError } from '../utils/api-client';
import { heading, commandResult } from '../utils/formatters';

export function registerNavCommands(program: Command): void {
  const nav = program
    .command('nav')
    .description('Navigation controls');

  nav
    .command('set <vehicleId> <latitude> <longitude>')
    .description('Set navigation destination by coordinates')
    .requiredOption('--user-id <userId>', 'User ID (required)')
    .action(async (vehicleId, latitude, longitude, opts) => {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        console.error(chalk.red('\n  Error: Latitude must be between -90 and 90.'));
        return;
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        console.error(chalk.red('\n  Error: Longitude must be between -180 and 180.'));
        return;
      }

      try {
        const { data } = await api.post(
          `/api/vehicles/${vehicleId}/commands/navigation/set-destination`,
          { latitude: lat, longitude: lng },
          { userId: opts.userId }
        );
        heading('Set Destination');
        commandResult(data.status || 'SUCCESS', `Destination set to (${lat}, ${lng})`);
      } catch (err) {
        handleApiError(err);
      }
    });
}
