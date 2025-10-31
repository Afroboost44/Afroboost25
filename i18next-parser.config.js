module.exports = {
  locales: ['en', 'fr', 'de'],
  output: 'public/locales/$LOCALE/translation.json',
  input: ['src/**/*.{ts,tsx}'],
  keySeparator: false,
  namespaceSeparator: false,
  keepRemoved: true
};
