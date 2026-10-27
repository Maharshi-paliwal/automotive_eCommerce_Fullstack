/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  setupFiles: ['<rootDir>/test/setup/testSetup.cjs'],
  clearMocks: true,
  restoreMocks: true,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'CommonJS', target: 'ES2022', esModuleInterop: true } }],
  },
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
}
