export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const isPrimaryWorker = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';
        if (isPrimaryWorker) {
            const { initScheduler } = await import('./lib/scheduler');
            initScheduler();
        } else {
            console.log(`[Instrumentation] Worker instance #${process.env.NODE_APP_INSTANCE} — skipping duplicate scheduler initialization.`);
        }
    }
}

