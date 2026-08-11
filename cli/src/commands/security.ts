import { Command } from 'commander';
import { api, handleApiError } from '../utils/api-client';
import { heading, commandResult } from '../utils/formatters';

export function registerSecurityCommands(program: Command): void {
  program
    .command('lock <vehicleId>')
    .description('Lock all doors')
    .requiredOption('--user-id <userId>', 'User ID (required)')
    .action(async (vehicleId, opts) => {
      try {
        const { data } = await api.post(
          `/api/vehicles/${vehicleId}/commands/security/lock`,
          undefined,
          { userId: opts.userId }
        );
        heading('Lock Doors');
        commandResult(data.status || 'SUCCESS', 'All doors locked.');
      } catch (err) {
        handleApiError(err);
      }
    });

  program
    .command('unlock <vehicleId>')
    .description('Unlock all doors')
    .requiredOption('--user-id <userId>', 'User ID (required)')
    .action(async (vehicleId, opts) => {
      try {
        const { data } = await api.post(
          `/api/vehicles/${vehicleId}/commands/security/unlock`,
          undefined,
          { userId: opts.userId }
        );
        heading('Unlock Doors');
        commandResult(data.status || 'SUCCESS', 'All doors unlocked.');
      } catch (err) {
        handleApiError(err);
      }
    });
}
