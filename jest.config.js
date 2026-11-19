module.exports = {
  preset: 'jest-expo',
  // The first React Native render in a cold CI runner can take more than the 5 s default.
  testTimeout: 30000,
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
