import workerpool from 'workerpool';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class Argon2Pool {
    private pool: workerpool.Pool;
    private healthy: boolean = true;

    constructor() {
        // Create worker pool with 4 workers
        this.pool = workerpool.pool(
            path.join(__dirname, '../workers/argon2.worker.js'),
            {
                minWorkers: 2,
                maxWorkers: 4,
                workerType: 'thread',
                // Handle worker crashes
                onCreateWorker: () => { console.log('✅ Worker created'); return undefined; },
                onTerminateWorker: () => { console.log('Worker terminated'); return undefined; }
            }
        );

        // Monitor pool health
        this.monitorHealth();
    }

    private monitorHealth() {
        setInterval(() => {
            const stats = this.pool.stats();
            if (stats.pendingTasks > 10) {
                console.warn(`⚠️ Worker pool backlog: ${stats.pendingTasks} tasks`);
            }
            if (stats.activeTasks === stats.totalWorkers) {
                console.warn('⚠️ Worker pool at capacity');
            }
        }, 5000);
    }

    async hash(password: string): Promise<string> {
        try {
            return await this.pool.exec('hashPassword', [password]);
        } catch (error) {
            console.error('Worker pool hash error:', error);
            this.healthy = false;
            // Fallback to direct execution
            console.log('⚠️ Falling back to direct Argon2 hash');
            const argon2 = (await import('argon2')).default;
            return argon2.hash(password, {
                type: argon2.argon2id,
                memoryCost: 19456,
                timeCost: 2,
                parallelism: 1
            });
        }
    }

    async verify(hash: string, password: string): Promise<boolean> {
        try {
            return await this.pool.exec('verifyPassword', [hash, password]);
        } catch (error) {
            console.error('Worker pool verify error:', error);
            this.healthy = false;
            // Fallback to direct execution
            console.log('⚠️ Falling back to direct Argon2 verify');
            const argon2 = (await import('argon2')).default;
            return argon2.verify(hash, password);
        }
    }

    async terminate(): Promise<void> {
        await this.pool.terminate();
        console.log('Worker pool terminated');
    }

    isHealthy(): boolean {
        return this.healthy;
    }

    getStats() {
        return this.pool.stats();
    }
}

// Export singleton
export const argon = new Argon2Pool();