import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { config } from '../config';
import type { WatcherEventType, WatcherUpdate } from '@shared/types';

export interface WatcherOptions {
  debounceMs?: number;
  maxWaitMs?: number;
  autoStart?: boolean;
  runsDir?: string;
}

export class Watcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private maxWaitTimer: NodeJS.Timeout | null = null;
  private pendingEvents = new Set<WatcherEventType>();
  private pendingPaths = new Set<string>();
  private readonly debounceMs: number;
  private readonly maxWaitMs: number;
  private readonly runsDir: string;

  constructor(options: WatcherOptions = {}) {
    super();
    this.debounceMs = options.debounceMs ?? config.watcherDebounceMs;
    this.maxWaitMs = options.maxWaitMs ?? config.watcherMaxWaitMs;
    this.runsDir = options.runsDir ?? config.runsDir;
    if (options.autoStart) {
      this.start();
    }
  }

  start() {
    if (this.watcher) return;

    this.watcher = chokidar.watch(this.runsDir, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      depth: 2, // watch TASK-XXX folders and their immediate children
      ignoreInitial: true
    });

    this.watcher
      .on('add', (path) => this.queueUpdate('add', path))
      .on('change', (path) => this.queueUpdate('change', path))
      .on('unlink', (path) => this.queueUpdate('unlink', path))
      .on('error', (error) => console.error(`Watcher error: ${error}`));

    console.log(`Watcher started on ${this.runsDir}`);
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
    this.pendingEvents.clear();
    this.pendingPaths.clear();
  }

  isActive(): boolean {
    return this.watcher !== null;
  }

  getDebounceMs(): number {
    return this.debounceMs;
  }

  queueUpdate(event: WatcherEventType, path: string) {
    this.pendingEvents.add(event);
    this.pendingPaths.add(path);

    // Trailing debounce: reset the quiet-period timer on every event.
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => this.flush(), this.debounceMs);

    // Max-wait guarantee: under continuous writes the debounce timer is
    // perpetually reset and would never fire. This cap forces a flush within
    // maxWaitMs so SSE clients keep getting live updates during long bursts.
    if (!this.maxWaitTimer) {
      this.maxWaitTimer = setTimeout(() => this.flush(), this.maxWaitMs);
    }
  }

  private flush() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }

    if (this.pendingEvents.size === 0 && this.pendingPaths.size === 0) {
      return;
    }

    const update: WatcherUpdate = {
      type: 'runs.changed',
      events: Array.from(this.pendingEvents),
      paths: Array.from(this.pendingPaths),
      timestamp: new Date().toISOString(),
    };
    this.pendingEvents.clear();
    this.pendingPaths.clear();
    this.emit('update', update);
  }
}

export const globalWatcher = new Watcher();
