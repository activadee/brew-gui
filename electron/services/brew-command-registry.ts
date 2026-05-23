import type { BrewRunOptions } from './brew-runner';
import { BrewRunner } from './brew-runner';

export type BrewCommandKey =
  | 'install.formula'
  | 'install.cask'
  | 'uninstall.formula'
  | 'uninstall.cask'
  | 'upgrade.formula'
  | 'upgrade.cask'
  | 'pin'
  | 'unpin'
  | 'update'
  | 'upgrade'
  | 'cleanup'
  | 'doctor'
  | 'uses.installed'
  | 'list.installed'
  | 'list.outdated'
  | 'info'
  | 'tap.add'
  | 'tap.remove'
  | 'services.start'
  | 'services.stop'
  | 'services.restart'
  | 'reinstall.formula'
  | 'reinstall.cask';

const COMMAND_BUILDERS: Record<BrewCommandKey, (params: Record<string, string>) => string[]> = {
  'install.formula': (p) => (p.force === 'true' ? ['install', '--formula', '--force', p.name] : ['install', '--formula', p.name]),
  'install.cask': (p) => (p.force === 'true' ? ['install', '--cask', '--force', p.name] : ['install', '--cask', p.name]),
  'uninstall.formula': (p) => ['uninstall', '--formula', p.name],
  'uninstall.cask': (p) => (p.zap === 'true' ? ['uninstall', '--cask', '--zap', p.name] : ['uninstall', '--cask', p.name]),
  'upgrade.formula': (p) => ['upgrade', '--formula', p.name],
  'upgrade.cask': (p) => ['upgrade', '--cask', p.name],
  pin: (p) => ['pin', p.name],
  unpin: (p) => ['unpin', p.name],
  update: () => ['update'],
  upgrade: () => ['upgrade'],
  cleanup: () => ['cleanup'],
  doctor: () => ['doctor'],
  'uses.installed': (p) => ['uses', '--installed', p.name],
  'list.installed': () => ['list', '--installed', '--json'],
  'list.outdated': () => ['outdated', '--json'],
  info: (p) => (p.kind === 'cask' ? ['info', '--cask', '--json', p.name] : ['info', '--formula', '--json', p.name]),
  'tap.add': (p) => ['tap', 'add', p.name],
  'tap.remove': (p) => ['tap', 'remove', p.name],
  'services.start': (p) => ['services', 'start', p.name],
  'services.stop': (p) => ['services', 'stop', p.name],
  'services.restart': (p) => ['services', 'restart', p.name],
  'reinstall.formula': (p) => ['reinstall', '--formula', p.name],
  'reinstall.cask': (p) => (p.zap === 'true' ? ['reinstall', '--cask', '--zap', p.name] : ['reinstall', '--cask', p.name])
};

export function buildAllowedCommand(key: BrewCommandKey, params: Record<string, string>): string[] {
  const builder = COMMAND_BUILDERS[key];
  if (!builder) {
    throw new Error(`Unknown brew command key: ${key}`);
  }

  return builder(params);
}

export class AllowedBrewRunner {
  constructor(private readonly runner: BrewRunner) {}

  runAllowed(key: BrewCommandKey, params: Record<string, string>, options?: BrewRunOptions) {
    return this.runner.runText(buildAllowedCommand(key, params), options);
  }

  runAllowedJson<T>(key: BrewCommandKey, params: Record<string, string>, options?: BrewRunOptions) {
    return this.runner.runJson<T>(buildAllowedCommand(key, params), options);
  }
}
