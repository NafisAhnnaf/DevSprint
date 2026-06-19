import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
    // Use ESM preset
    preset: 'ts-jest/presets/default-esm',

    // Test environment
    testEnvironment: 'node',

    // Clear mocks between tests
    clearMocks: true,

    // Treat .ts files as ES modules
    extensionsToTreatAsEsm: ['.ts'],

    // Module name mapping for ES modules
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },

    // Transform configuration
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
                isolatedModules: true,
                diagnostics: {
                    ignoreCodes: [151002] // Ignore hybrid module warning
                }
            },
        ],
    },

    // Test file patterns
    testMatch: [
        '**/tests/**/*.test.ts',
        '**/src/**/*.test.ts'
    ],

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],

    // Coverage configuration
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/generated/**',
        '!src/tests/**',
    ],

    // Coverage thresholds (optional)
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },

    // Verbose output
    verbose: true,

    // Handle ES modules
    moduleDirectories: ['node_modules', 'src'],

    // Transform ignore patterns
    transformIgnorePatterns: [
        'node_modules/(?!(module-that-needs-transforming)/)'
    ],
};

export default config;