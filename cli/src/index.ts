#!/usr/bin/env node

import dotenv from 'dotenv';
import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth';
import { registerConnectionsCommands } from './commands/connections';
import { registerVehicleCommands } from './commands/vehicle';
import { registerChargeCommands } from './commands/charge';
import { registerSecurityCommands } from './commands/security';
import { registerNavCommands } from './commands/nav';
import { registerScheduleCommands } from './commands/schedule';
import { registerWebhooksCommands } from './commands/webhooks';
import { registerCompatibilityCommands } from './commands/compatibility';

dotenv.config();

const program = new Command();

program
  .name('smartcar')
  .description('CLI tool for interacting with Smartcar-connected vehicles')
  .version('1.0.0');

registerAuthCommands(program);
registerConnectionsCommands(program);
registerVehicleCommands(program);
registerChargeCommands(program);
registerSecurityCommands(program);
registerNavCommands(program);
registerScheduleCommands(program);
registerWebhooksCommands(program);
registerCompatibilityCommands(program);

program.parse();
