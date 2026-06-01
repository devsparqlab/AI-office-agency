import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { config } from '../config';

export class Watcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  start() {
    if (this.watcher) return;

    this.watcher = chokidar.watch(config.runsDir, {
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

    console.log(`Watcher started on ${config.runsDir}`);
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  isActive(): boolean {
    return this.watcher !== null;
  }

  private queueUpdate(event: string, path: string) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.emit('update', { event, path });
      this.debounceTimer = null;
    }, 500); // 500ms debounce
  }
}

export const globalWatcher = new Watcher();
