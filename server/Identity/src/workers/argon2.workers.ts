import workerpool from 'workerpool';

// Worker functions - import argon2 INSIDE each function
async function hashPassword(password: string): Promise<string> {
    try {
        // Dynamic import inside the function (worker context)
        const argon2 = (await import('argon2')).default;
        return await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 19456,
            timeCost: 2,
            parallelism: 1
        });
    } catch (error) {
        console.error('❌ Hash error in worker:', error);
        throw error;
    }
}

async function verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
        // Dynamic import inside the function (worker context)
        const argon2 = (await import('argon2')).default;
        return await argon2.verify(hash, password);
    } catch (error) {
        console.error('❌ Verify error in worker:', error);
        return false;
    }
}

// Register worker functions
workerpool.worker({
    hashPassword,
    verifyPassword
});