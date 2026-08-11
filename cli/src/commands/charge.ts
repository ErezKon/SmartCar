import { Command } from 'commander';
import chalk from 'chalk';
import { api, handleApiError } from '../utils/api-client';
import { heading, keyValue, commandResult, signalTable } from '../utils/formatters';

export function registerChargeCommands(program: Command): void {
  const charge = program
    .command('charge')
    .description('Charging controls');

  charge
    .command('start <vehicleId>')
    .description('Start charging')
    .requiredOption('--user-id <userId>', 'User ID (required)')
    .action(async (vehicleId, opts) => {
      try {
        const { data } = await api.post(
          `/api/vehicles/${vehicleId}/commands/charge/start`,
          undefined,
          { userId: opts.userId }
        );
        heading('Start Charging');
        commandResult(data.status || 'SUCCESS', data.message);
      } catch (err) {
        handleApiError(err);
      }
    });

  charge
    .command('stop <vehicleId>')
    .description('Stop charging')
    .requiredOption('--user-id <userId>', 'User ID (required)')
    .action(async (vehicleId, opts) => {
      try {
        const { data } = await api.post(
          `/api/vehicles/${vehicleId}/commands/charge/stop`,
          undefined,
          { userId: opts.userId }
        );
        heading('Stop Charging');
        commandResult(data.status || 'SUCCESS', data.message);
      } catch (err) {
        handleApiError(err);
      }
    });

  charge
    .command('limit <vehicleId> <percent>')
    .description('Set charge limit percentage (0-100)')
    .requiredOption('--user-id <userId>', 'User ID (required)')
    .action(async (vehicleId, percent, opts) => {
      const pct = parseInt(percent, 10);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        console.error(chalk.red('\n  Error: Charge limit must be between 0 and 100.'));
        return;
      }
      try {
        const { data } = await api.post(
          `/api/vehicles/${vehicleId}/commands/charge/set-limit`,
          { percent: pct },
          { userId: opts.userId }
        );
        heading('Set Charge Limit');
        commandResult(data.status || 'SUCCESS', `Charge limit set to ${pct}%`);
      } catch (err) {
        handleApiError(err);
      }
    });

  charge
    .command('status <vehicleId>')
    .description('Show charging-related signals')
    .requiredOption('--user-id <userId>', 'User ID (required)')
    .action(async (vehicleId, opts) => {
      try {
        const chargeSignals = [
          'charge-ischarging',
          'charge-detailedchargingstatus',
          'charge-ischargingcableconnected',
          'charge-chargelimits',
          'charge-chargerate',
          'charge-voltage',
          'charge-wattage',
          'charge-amperage',
          'charge-energyadded',
          'charge-timetocomplete',
          'tractionbattery-stateofcharge',
          'tractionbattery-range',
        ];

        heading(`Charge Status for ${vehicleId}`);
        const results: Array<{ code: string; value: any; dataAge?: string }> = [];

        for (const code of chargeSignals) {
          try {
            const { data } = await api.get(
              `/api/vehicles/${vehicleId}/signals/${code}`,
              { userId: opts.userId }
            );
            const signal = data.data || data;
            const attrs = signal.attributes || signal;
            results.push({
              code,
              value: attrs.value,
              dataAge: attrs.dataAge,
            });
          } catch {
            results.push({ code, value: null, dataAge: undefined });
          }
        }

        signalTable(results);
      } catch (err) {
        handleApiError(err);
      }
    });
}
