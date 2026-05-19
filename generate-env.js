// generate-env.js
const fs = require('fs');
const content = `export const environment = {
  production: true,
  supabaseUrl: '${process.env.NG_APP_SUPABASE_URL}',
  supabaseKey: '${process.env.NG_APP_SUPABASE_API_KEY}'
};`;
fs.writeFileSync('./src/environments/environment.ts', content);