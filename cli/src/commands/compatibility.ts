import { Command } from 'commander';
import chalk from 'chalk';
import { api, handleApiError } from '../utils/api-client';
import { heading, table, json as jsonOutput } from '../utils/formatters';

export function registerCompatibilityCommands(program: Command): void {
  const compat = program
    .command('compat')
    .description('Vehicle compatibility checks');

  compat
    .command('check')
    .description('Check MG4 BEV compatibility')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
      try {
        const { data } = await api.get('/api/compatibility/mg');
        if (opts.json) {
          jsonOutput(data);
          return;
        }
        heading('MG BEV Compatibility');
        const vehicles = data.data || data;
        if (!vehicles || (Array.isArray(vehicles) && vehicles.length === 0)) {
          console.log(chalk.gray('\n  No compatibility data found for MG BEV.'));
          return;
        }
        if (Array.isArray(vehicles)) {
          const rows = vehicles.map((v: any) => [
            v.attributes?.make || v.make || 'MG',
            v.attributes?.model || v.model || 'N/A',
            v.attributes?.year || v.year || 'N/A',
            v.attributes?.powertrainType || v.powertrainType || 'BEV',
          ]);
          table(['Make', 'Model', 'Year', 'Powertrain'], rows);
        } else {
          jsonOutput(vehicles);
        }
      } catch (err) {
        handleApiError(err);
      }
    });

  compat
    .command('search')
    .description('Search vehicle compatibility')
    .option('--make <make>', 'Filter by vehicle make')
    .option('--region <region>', 'Filter by region (US, CA, EUROPE)')
    .option('--powertrain <type>', 'Filter by powertrain type (ICE, BEV, PHEV, EV)')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
      try {
        const query: Record<string, string> = {};
        if (opts.make) query.make = opts.make;
        if (opts.region) query.region = opts.region;
        if (opts.powertrain) query.powertrainType = opts.powertrain;

        const { data } = await api.get('/api/compatibility', { query });
        if (opts.json) {
          jsonOutput(data);
          return;
        }
        heading('Compatible Vehicles');
        const vehicles = data.data || data;
        if (!vehicles || (Array.isArray(vehicles) && vehicles.length === 0)) {
          console.log(chalk.gray('\n  No compatible vehicles found with the given filters.'));
          return;
        }
        if (Array.isArray(vehicles)) {
          const rows = vehicles.map((v: any) => [
            v.attributes?.make || v.make || 'N/A',
            v.attributes?.model || v.model || 'N/A',
            v.attributes?.year || v.year || 'N/A',
            v.attributes?.powertrainType || v.powertrainType || 'N/A',
          ]);
          table(['Make', 'Model', 'Year', 'Powertrain'], rows);
          console.log(chalk.gray(`\n  ${rows.length} compatible vehicle(s) found.`));
        } else {
          jsonOutput(vehicles);
        }
      } catch (err) {
        handleApiError(err);
      }
    });
}
