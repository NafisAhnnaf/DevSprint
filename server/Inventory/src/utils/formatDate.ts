export const formatDateForDb = (date: string | Date): Date => {
    const d = new Date(date);
    // Return Date object at UTC midnight
    return new Date(Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        0, 0, 0, 0
    ));
}

export const formatDateForCache = (date: string | Date): string => {
    const d = new Date(date);
    // Return YYYY-MM-DD string for cache keys
    return d.toISOString().split('T')[0];
}