import { Command } from 'commander';
import chalk from 'chalk';
import { api, handleApiError } from '../utils/api-client';
import { heading, keyValue, commandResult, signalTable, table, json, success, warn } from '../utils/formatters';

export function registerSaicCommands(program: Command): void {
  const saic = program
    .command('saic')
    .description('SAIC / MG iSmart direct integration');

  // --- saic login ---
  saic
    .command('login')
    .description('Connect SAIC account (saves encrypted credentials)')
    .requiredOption('--username <username>', 'SAIC account email or phone')
    .requiredOption('--password <password>', 'SAIC account password')
    .option('--region <region>', 'Region code (eu, au, tr, il, br, in, th, cn)', 'il')
    .action(async (opts) => {
      try {
        warn('Logging in via the API may invalidate your iSmart phone app session.');
        const { data } = await api.post('/api/saic/account', {
          username: opts.username,
          password: opts.password,
          region: opts.region,
        });
        heading('SAIC Login');
        keyValue({
          'Status': data.status,
          'Username': data.username,
          'Region': data.region,
          'User ID': data.userId,
          'Token Expires In': `${data.expiresIn}s`,
        });
      } catch (err) {
        handleApiError(err);
      }
    });

  // --- saic logout ---
  saic
    .command('logout')
    .description('Disconnect SAIC account and remove stored credentials')
    .action(async () => {
      try {
        await api.delete('/api/saic/account');
        heading('SAIC Logout');
        success('SAIC account disconnected.');
      } catch (err) {
        handleApiError(err);
      }
    });

  // --- saic status ---
  saic
    .command('status')
    .description('Show SAIC account connection status')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
      try {
        const { data } = await api.get('/api/saic/account');
        if (opts.json) {
          json(data);
          return;
        }
        heading('SAIC Account Status');
        if (!data.connected) {
          console.log(chalk.yellow('\n  No SAIC account connected.'));
          console.log(chalk.gray('  Run "smartcar saic login --username <email> --password <pass>" to connect.'));
          return;
        }
        keyValue({
          'Connected': true,
          'Username': data.username,
          'Region': data.region,
          'Token Valid': data.tokenValid,
          'Token Expires': data.tokenExpiresAt
            ? new Date(data.tokenExpiresAt * 1000).toISOString()
            : null,
          'Created': data.createdAt,
        });
      } catch (err) {
        handleApiError(err);
      }
    });

  // --- saic vehicles ---
  saic
    .command('vehicles')
    .description('List SAIC vehicles')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
      try {
        const { data } = await api.get('/api/saic/vehicles');
        if (opts.json) {
          json(data);
          return;
        }
        heading('SAIC Vehicles');
        const vehicles = data.data || data;
        if (!Array.isArray(vehicles) || vehicles.length === 0) {
          console.log(chalk.gray('\n  No vehicles found.'));
          return;
        }
        const rows = vehicles.map((v: any) => [
          v.vin,
          v.brandName || v.brand || 'MG',
          v.modelName || v.model || 'N/A',
          v.colorName || v.color || 'N/A',
          v.series || 'N/A',
        ]);
        table(['VIN', 'Brand', 'Model', 'Color', 'Series'], rows);
      } catch (err) {
        handleApiError(err);
      }
    });

  // --- saic vehicle-status <vin> ---
  saic
    .command('vehicle-status <vin>')
    .description('Get vehicle status (cached by default)')
    .option('--refresh', 'Force live refresh (wakes the car, drains 12V battery)')
    .option('--json', 'Output raw JSON')
    .action(async (vin, opts) => {
      try {
        if (opts.refresh) {
          warn('Live refresh will wake the vehicle. Frequent use drains the 12V battery.');
        }
        const query: Record<string, string> = {};
        if (opts.refresh) query.refresh = 'true';

        const { data } = await api.get(`/api/saic/vehicles/${vin}/status`, { query });
        if (opts.json) {
          json(data);
          return;
        }
        heading(`Vehicle Status: ${vin}`);
        if (!data.data) {
          console.log(chalk.yellow('\n  No status data available. Try --refresh to wake the vehicle.'));
          return;
        }
        const s = data.data;
        keyValue({
          'Cached': data.cached ?? 'N/A',
          'Mileage (km)': s.mileage != null ? (s.mileage * 0.1).toFixed(1) : null,
          'EV Range (km)': s.fuelRangeElec != null ? (s.fuelRangeElec * 0.1).toFixed(1) : null,
          'Ext Temp (C)': s.exteriorTemperature,
          'Int Temp (C)': s.interiorTemperature,
          'Lock Status': s.lockStatus === 1 ? 'Locked' : 'Unlocked',
          'Power Mode': s.powerMode,
          'Battery (V)': s.batteryVoltage,
        });
      } catch (err) {
        handleApiError(err);
      }
    });

  // --- saic signals <vin> ---
  saic
    .command('signals <vin>')
    .description('Get normalized signals (combined status + charging)')
    .option('--refresh', 'Force live refresh')
    .option('--json', 'Output raw JSON')
    .action(async (vin, opts) => {
      try {
        const query: Record<string, string> = {};
        if (opts.refresh) query.refresh = 'true';

        const { data } = await api.get(`/api/saic/vehicles/${vin}/signals`, { query });
        if (opts.json) {
          json(data);
          return;
        }
        heading(`Signals for ${vin}`);
        const signals = data.data || [];
        if (signals.length === 0) {
          console.log(chalk.gray('\n  No signals available.'));
          return;
        }
        signalTable(signals.map((s: any) => ({
          code: s.code,
          value: s.value,
          dataAge: s.unit || undefined,
        })));
      } catch (err) {
        handleApiError(err);
      }
    });

  // --- saic charge start|stop <vin> ---
  const saicCharge = saic
    .command('charge')
    .description('SAIC charging controls');

  saicCharge
    .command('start <vin>')
    .description('Start charging')
    .action(async (vin) => {
      try {
        const { data } = await api.post(`/api/saic/vehicles/${vin}/commands/startCharging`);
        heading('SAIC Start Charging');
        commandResult('SUCCESS', `Charging started on ${vin.slice(0, 6)}...`);
      } catch (err) {
        handleApiError(err);
      }
    });

  saicCharge
    .command('stop <vin>')
    .description('Stop charging')
    .action(async (vin) => {
      try {
        const { data } = await api.post(`/api/saic/vehicles/${vin}/commands/stopCharging`);
        heading('SAIC Stop Charging');
        commandResult('SUCCESS', `Charging stopped on ${vin.slice(0, 6)}...`);
      } catch (err) {
        handleApiError(err);
      }
    });

  saicCharge
    .command('limit <vin> <percent>')
    .description('Set charge limit (40, 50, 60, 70, 80, 90, 100)')
    .action(async (vin, percent) => {
      const pct = parseInt(percent, 10);
      const valid = [40, 50, 60, 70, 80, 90, 100];
      if (!valid.includes(pct)) {
        console.error(chalk.red(`\n  Error: Charge limit must be one of: ${valid.join(', ')}`));
        return;
      }
      try {
        const { data } = await api.post(`/api/saic/vehicles/${vin}/commands/setChargeLimit`, { percent: pct });
        heading('SAIC Set Charge Limit');
        commandResult('SUCCESS', `Charge limit set to ${pct}%`);
      } catch (err) {
        handleApiError(err);
      }
    });

  saicCharge
    .command('current <vin> <level>')
    .description('Set charge current (6A, 8A, 16A, Max)')
    .action(async (vin, level) => {
      const valid = ['6A', '8A', '16A', 'Max'];
      if (!valid.includes(level)) {
        console.error(chalk.red(`\n  Error: Current must be one of: ${valid.join(', ')}`));
        return;
      }
      try {
        const { data } = await api.post(`/api/saic/vehicles/${vin}/commands/setChargeCurrent`, { current: level });
        heading('SAIC Set Charge Current');
        commandResult('SUCCESS', `Charge current set to ${level}`);
      } catch (err) {
        handleApiError(err);
      }
    });

  // --- saic lock|unlock <vin> ---
  saic
    .command('lock <vin>')
    .description('Lock vehicle doors')
    .action(async (vin) => {
      try {
        const { data } = await api.post(`/api/saic/vehicles/${vin}/commands/lock`);
        heading('SAIC Lock');
        commandResult('SUCCESS', 'Vehicle locked.');
      } catch (err) {
        handleApiError(err);
      }
    });

  saic
    .command('unlock <vin>')
    .description('Unlock vehicle doors')
    .option('--tailgate', 'Unlock tailgate instead of doors')
    .action(async (vin, opts) => {
      try {
        const body = opts.tailgate ? { lockId: 2 } : { lockId: 3 };
        const { data } = await api.post(`/api/saic/vehicles/${vin}/commands/unlock`, body);
        heading('SAIC Unlock');
        commandResult('SUCCESS', opts.tailgate ? 'Tailgate unlocked.' : 'Doors unlocked.');
      } catch (err) {
        handleApiError(err);
      }
    });

  // --- saic climate <vin> ---
  saic
    .command('climate <vin>')
    .description('Start or stop climate control')
    .option('--stop', 'Stop climate instead of starting')
    .option('--temp <degrees>', 'Target temperature in Celsius (17-33)', '22')
    .option('--fan <speed>', 'Fan speed: 1 (low), 2 (med), 3 (high), 5 (defrost)', '2')
    .action(async (vin, opts) => {
      try {
        if (opts.stop) {
          const { data } = await api.post(`/api/saic/vehicles/${vin}/commands/stopClimate`);
          heading('SAIC Climate');
          commandResult('SUCCESS', 'Climate control stopped.');
        } else {
          const temp = parseInt(opts.temp, 10);
          const fan = parseInt(opts.fan, 10);
          if (temp < 17 || temp > 33) {
            console.error(chalk.red('\n  Error: Temperature must be between 17 and 33.'));
            return;
          }
          const { data } = await api.post(`/api/saic/vehicles/${vin}/commands/startClimate`, {
            temperature: temp,
            fanSpeed: fan,
          });
          heading('SAIC Climate');
          commandResult('SUCCESS', `Climate started: ${temp}C, fan speed ${fan}`);
        }
      } catch (err) {
        handleApiError(err);
      }
    });

  // --- saic find <vin> ---
  saic
    .command('find <vin>')
    .description('Activate horn and lights to find the vehicle')
    .action(async (vin) => {
      try {
        const { data } = await api.post(`/api/saic/vehicles/${vin}/commands/findVehicle`);
        heading('SAIC Find Vehicle');
        commandResult('SUCCESS', 'Horn and lights activated.');
      } catch (err) {
        handleApiError(err);
      }
    });

  // --- saic messages ---
  saic
    .command('messages')
    .description('Get alarm/command/news messages')
    .option('--group <group>', 'Message group: ALARM, COMMAND, NEWS', 'ALARM')
    .option('--page <n>', 'Page number', '1')
    .option('--size <n>', 'Page size', '20')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
      try {
        const query: Record<string, string> = {
          group: opts.group,
          pageNum: opts.page,
          pageSize: opts.size,
        };
        const { data } = await api.get('/api/saic/messages', { query });
        if (opts.json) {
          json(data);
          return;
        }
        heading(`SAIC Messages (${opts.group})`);
        const messages = data.data || data;
        if (!Array.isArray(messages) || messages.length === 0) {
          console.log(chalk.gray('\n  No messages found.'));
          return;
        }
        const rows = messages.map((m: any) => [
          m.messageId || m.id || 'N/A',
          m.title || 'N/A',
          m.messageTime || m.created_at || 'N/A',
        ]);
        table(['ID', 'Title', 'Time'], rows);
      } catch (err) {
        handleApiError(err);
      }
    });

  // --- saic history <vin> ---
  saic
    .command('history <vin>')
    .description('Get command execution history')
    .option('--limit <n>', 'Max results', '20')
    .option('--json', 'Output raw JSON')
    .action(async (vin, opts) => {
      try {
        const query: Record<string, string> = { limit: opts.limit };
        const { data } = await api.get(`/api/saic/vehicles/${vin}/commands`, { query });
        if (opts.json) {
          json(data);
          return;
        }
        heading(`Command History for ${vin.slice(0, 6)}...`);
        const logs = data.data || data;
        if (!Array.isArray(logs) || logs.length === 0) {
          console.log(chalk.gray('\n  No command history found.'));
          return;
        }
        const rows = logs.map((l: any) => [
          l.command,
          l.status,
          l.duration_ms != null ? `${l.duration_ms}ms` : 'N/A',
          l.created_at || 'N/A',
        ]);
        table(['Command', 'Status', 'Duration', 'Time'], rows);
      } catch (err) {
        handleApiError(err);
      }
    });
}
