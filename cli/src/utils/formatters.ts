import chalk from 'chalk';
import Table from 'cli-table3';

export function heading(text: string): void {
  console.log(chalk.bold.cyan(`\n${text}`));
  console.log(chalk.cyan('─'.repeat(text.length)));
}

export function success(text: string): void {
  console.log(chalk.green(`\n  ${text}`));
}

export function warn(text: string): void {
  console.log(chalk.yellow(`\n  ${text}`));
}

export function info(text: string): void {
  console.log(chalk.gray(`  ${text}`));
}

export function keyValue(pairs: Record<string, any>): void {
  const maxKeyLen = Math.max(...Object.keys(pairs).map(k => k.length));
  for (const [key, value] of Object.entries(pairs)) {
    const label = chalk.bold(key.padEnd(maxKeyLen));
    const val = formatValue(value);
    console.log(`  ${label}  ${val}`);
  }
}

export function formatValue(value: any): string {
  if (value === null || value === undefined) return chalk.gray('N/A');
  if (typeof value === 'boolean') return value ? chalk.green('Yes') : chalk.red('No');
  if (typeof value === 'number') return chalk.white(String(value));
  if (typeof value === 'object') return chalk.white(JSON.stringify(value));
  return chalk.white(String(value));
}

export function table(headers: string[], rows: any[][]): void {
  const t = new Table({
    head: headers.map(h => chalk.bold.cyan(h)),
    style: { head: [], border: ['gray'] },
  });

  for (const row of rows) {
    t.push(row.map(cell => formatValue(cell)));
  }

  console.log(t.toString());
}

export function signalTable(signals: Array<{ code: string; value: any; dataAge?: string }>): void {
  const t = new Table({
    head: [chalk.bold.cyan('Signal'), chalk.bold.cyan('Value'), chalk.bold.cyan('Data Age')],
    style: { head: [], border: ['gray'] },
    colWidths: [40, 30, 25],
    wordWrap: true,
  });

  for (const signal of signals) {
    t.push([
      chalk.white(signal.code),
      formatSignalValue(signal.value),
      signal.dataAge ? chalk.gray(signal.dataAge) : chalk.gray('N/A'),
    ]);
  }

  console.log(t.toString());
}

function formatSignalValue(value: any): string {
  if (value === null || value === undefined) return chalk.gray('N/A');
  if (typeof value === 'boolean') return value ? chalk.green('true') : chalk.red('false');
  if (typeof value === 'number') return chalk.yellow(String(value));
  if (typeof value === 'object') return chalk.white(JSON.stringify(value, null, 0));
  return chalk.white(String(value));
}

export function commandResult(status: string, message?: string): void {
  if (status === 'SUCCESS' || status === 'success') {
    console.log(chalk.green(`\n  Command: SUCCESS`));
  } else if (status === 'PENDING' || status === 'pending') {
    console.log(chalk.yellow(`\n  Command: PENDING (accepted, processing...)`));
  } else {
    console.log(chalk.red(`\n  Command: ${status}`));
  }
  if (message) {
    console.log(chalk.gray(`  ${message}`));
  }
}

export function json(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}
