import { Command } from 'commander';
import chalk from 'chalk';
import { api, handleApiError } from '../utils/api-client';
import { heading, keyValue, signalTable, table, json } from '../utils/formatters';

export function registerVehicleCommands(program: Command): void {
  const vehicle = program
    .command('vehicle')
    .description('Vehicle information and signals');

  vehicle
    .command('info <vehicleId>')
    .description('Show vehicle attributes')
    .option('--user-id <userId>', 'User ID (sc-user-id header)')
    .option('--json', 'Output raw JSON')
    .action(async (vehicleId, opts) => {
      try {
        const { data } = await api.get(`/api/vehicles/${vehicleId}`, { userId: opts.userId });
        if (opts.json) {
          json(data);
          return;
        }
        heading('Vehicle Info');
        const attrs = data.data?.attributes || data.attributes || data;
        keyValue({
          'Vehicle ID': data.data?.id || vehicleId,
          'Make': attrs.make,
          'Model': attrs.model,
          'Year': attrs.year,
          'Powertrain': attrs.powertrainType || attrs.powertrain_type,
        });
      } catch (err) {
        handleApiError(err);
      }
    });

  vehicle
    .command('signals <vehicleId>')
    .description('Show all signals for a vehicle')
    .requiredOption('--user-id <userId>', 'User ID (required)')
    .option('--json', 'Output raw JSON')
    .action(async (vehicleId, opts) => {
      try {
        const { data } = await api.get(`/api/vehicles/${vehicleId}/signals`, { userId: opts.userId });
        if (opts.json) {
          json(data);
          return;
        }
        heading(`Signals for ${vehicleId}`);
        const signals = data.data || data;
        if (Array.isArray(signals)) {
          const formatted = signals.map((s: any) => ({
            code: s.id || s.signalCode || s.code,
            value: s.attributes?.value ?? s.value,
            dataAge: s.attributes?.dataAge || s.dataAge,
          }));
          signalTable(formatted);
        } else {
          json(signals);
        }
      } catch (err) {
        handleApiError(err);
      }
    });

  vehicle
    .command('signal <vehicleId> <signalCode>')
    .description('Show a specific signal value')
    .requiredOption('--user-id <userId>', 'User ID (required)')
    .option('--json', 'Output raw JSON')
    .action(async (vehicleId, signalCode, opts) => {
      try {
        const { data } = await api.get(
          `/api/vehicles/${vehicleId}/signals/${signalCode}`,
          { userId: opts.userId }
        );
        if (opts.json) {
          json(data);
          return;
        }
        heading(`Signal: ${signalCode}`);
        const signal = data.data || data;
        const attrs = signal.attributes || signal;
        keyValue({
          'Signal Code': signal.id || signalCode,
          'Value': attrs.value,
          'Data Age': attrs.dataAge || null,
          'Unit': attrs.unit || null,
        });
      } catch (err) {
        handleApiError(err);
      }
    });

  vehicle
    .command('history <vehicleId>')
    .description('Show signal history from local cache')
    .option('--signal <signalCode>', 'Filter by signal code')
    .option('--json', 'Output raw JSON')
    .action(async (vehicleId, opts) => {
      try {
        const query: Record<string, string> = {};
        if (opts.signal) query.signalCode = opts.signal;

        const { data } = await api.get(`/api/vehicles/${vehicleId}/signals-history`, { query });
        if (opts.json) {
          json(data);
          return;
        }
        heading(`Signal History for ${vehicleId}`);
        if (!data.data || data.data.length === 0) {
          console.log(chalk.gray('\n  No signal history found.'));
          return;
        }
        const rows = data.data.map((s: any) => [
          s.signal_code || s.signalCode,
          typeof s.value === 'object' ? JSON.stringify(s.value) : s.value,
          s.data_age || s.dataAge || 'N/A',
          s.recorded_at || s.recordedAt || 'N/A',
        ]);
        table(['Signal', 'Value', 'Data Age', 'Recorded'], rows);
      } catch (err) {
        handleApiError(err);
      }
    });

  vehicle
    .command('catalog')
    .description('Show the signal codes catalog')
    .option('--group <group>', 'Filter by signal group')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
      try {
        const { data } = await api.get('/api/vehicles/signals/catalog');
        if (opts.json) {
          json(data);
          return;
        }
        heading('Signal Codes Catalog');
        const groups: Record<string, any[]> = data.groups || {};
        const allSignals: Record<string, any> = data.signals || {};
        const totalSignals = data.totalSignals || Object.keys(allSignals).length;

        if (opts.group) {
          const groupSignals = groups[opts.group];
          if (!groupSignals) {
            console.log(chalk.red(`\n  Unknown group: ${opts.group}`));
            console.log(chalk.gray(`  Available groups: ${Object.keys(groups).join(', ')}`));
            return;
          }
          console.log(chalk.bold(`\n  ${opts.group}`) + chalk.gray(` (${groupSignals.length} signals)`));
          for (const signal of groupSignals) {
            const code = typeof signal === 'string' ? signal : signal.code;
            const desc = typeof signal === 'string' ? '' : signal.description || '';
            console.log(`    ${chalk.white(code)}${desc ? chalk.gray(` - ${desc}`) : ''}`);
          }
        } else {
          console.log(chalk.gray(`\n  Total: ${totalSignals} signals across ${Object.keys(groups).length} groups\n`));
          for (const [groupName, groupSignals] of Object.entries(groups)) {
            const items = Array.isArray(groupSignals) ? groupSignals : [];
            console.log(chalk.bold(`  ${groupName}`) + chalk.gray(` (${items.length})`));
            for (const signal of items) {
              const code = typeof signal === 'string' ? signal : signal.code;
              const desc = typeof signal === 'string' ? '' : signal.description || '';
              console.log(`    ${chalk.white(code)}${desc ? chalk.gray(` - ${desc}`) : ''}`);
            }
            console.log();
          }
        }
      } catch (err) {
        handleApiError(err);
      }
    });
}
