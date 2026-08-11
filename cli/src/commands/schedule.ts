import { Command } from 'commander';
import chalk from 'chalk';
import { api, handleApiError } from '../utils/api-client';
import { heading, commandResult, success } from '../utils/formatters';

async function prompt(questions: any[]): Promise<any> {
  const inquirer = (await import('inquirer')).default;
  return inquirer.prompt(questions);
}

export function registerScheduleCommands(program: Command): void {
  const schedule = program
    .command('schedule')
    .description('Charge schedule management');

  schedule
    .command('daily <vehicleId>')
    .description('Set a daily charge schedule (interactive)')
    .requiredOption('--user-id <userId>', 'User ID (required)')
    .action(async (vehicleId, opts) => {
      try {
        const answers = await prompt([
          {
            type: 'input',
            name: 'startTime',
            message: 'Start time (HH:mm):',
            validate: (v: string) => /^\d{2}:\d{2}$/.test(v) || 'Use HH:mm format',
          },
          {
            type: 'input',
            name: 'endTime',
            message: 'End time (HH:mm):',
            validate: (v: string) => /^\d{2}:\d{2}$/.test(v) || 'Use HH:mm format',
          },
          {
            type: 'confirm',
            name: 'enabled',
            message: 'Enable schedule?',
            default: true,
          },
        ]);

        const body = {
          data: {
            type: 'chargeSchedule',
            attributes: {
              startTime: answers.startTime,
              endTime: answers.endTime,
              enabled: answers.enabled,
            },
          },
        };

        const { data } = await api.post(
          `/api/vehicles/${vehicleId}/charge-schedules/daily`,
          body,
          { userId: opts.userId }
        );
        heading('Daily Charge Schedule');
        commandResult(data.status || 'SUCCESS', `Schedule set: ${answers.startTime} - ${answers.endTime}`);
      } catch (err) {
        handleApiError(err);
      }
    });

  schedule
    .command('weekly <vehicleId>')
    .description('Set a weekly charge schedule (interactive)')
    .requiredOption('--user-id <userId>', 'User ID (required)')
    .action(async (vehicleId, opts) => {
      try {
        const answers = await prompt([
          {
            type: 'checkbox',
            name: 'days',
            message: 'Select days:',
            choices: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          },
          {
            type: 'input',
            name: 'startTime',
            message: 'Start time (HH:mm):',
            validate: (v: string) => /^\d{2}:\d{2}$/.test(v) || 'Use HH:mm format',
          },
          {
            type: 'input',
            name: 'endTime',
            message: 'End time (HH:mm):',
            validate: (v: string) => /^\d{2}:\d{2}$/.test(v) || 'Use HH:mm format',
          },
          {
            type: 'confirm',
            name: 'enabled',
            message: 'Enable schedule?',
            default: true,
          },
        ]);

        const body = {
          data: {
            type: 'chargeSchedule',
            attributes: {
              days: answers.days,
              startTime: answers.startTime,
              endTime: answers.endTime,
              enabled: answers.enabled,
            },
          },
        };

        const { data } = await api.post(
          `/api/vehicles/${vehicleId}/charge-schedules/weekly`,
          body,
          { userId: opts.userId }
        );
        heading('Weekly Charge Schedule');
        commandResult(data.status || 'SUCCESS', `Schedule set for ${answers.days.join(', ')}: ${answers.startTime} - ${answers.endTime}`);
      } catch (err) {
        handleApiError(err);
      }
    });

  schedule
    .command('workweek <vehicleId>')
    .description('Set a workweek charge schedule (interactive)')
    .requiredOption('--user-id <userId>', 'User ID (required)')
    .action(async (vehicleId, opts) => {
      try {
        const answers = await prompt([
          {
            type: 'input',
            name: 'startTime',
            message: 'Start time (HH:mm):',
            validate: (v: string) => /^\d{2}:\d{2}$/.test(v) || 'Use HH:mm format',
          },
          {
            type: 'input',
            name: 'endTime',
            message: 'End time (HH:mm):',
            validate: (v: string) => /^\d{2}:\d{2}$/.test(v) || 'Use HH:mm format',
          },
          {
            type: 'confirm',
            name: 'enabled',
            message: 'Enable schedule?',
            default: true,
          },
        ]);

        const body = {
          data: {
            type: 'chargeSchedule',
            attributes: {
              startTime: answers.startTime,
              endTime: answers.endTime,
              enabled: answers.enabled,
            },
          },
        };

        const { data } = await api.post(
          `/api/vehicles/${vehicleId}/charge-schedules/workweek`,
          body,
          { userId: opts.userId }
        );
        heading('Workweek Charge Schedule');
        commandResult(data.status || 'SUCCESS', `Schedule set: ${answers.startTime} - ${answers.endTime}`);
      } catch (err) {
        handleApiError(err);
      }
    });

  schedule
    .command('delete <vehicleId> <scheduleId>')
    .description('Delete a charge schedule')
    .requiredOption('--user-id <userId>', 'User ID (required)')
    .action(async (vehicleId, scheduleId, opts) => {
      try {
        await api.delete(
          `/api/vehicles/${vehicleId}/charge-schedules/${scheduleId}`,
          { userId: opts.userId }
        );
        success(`Schedule ${scheduleId} deleted successfully.`);
      } catch (err) {
        handleApiError(err);
      }
    });
}
