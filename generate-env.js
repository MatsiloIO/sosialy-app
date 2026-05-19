// generate-env.js
const fs = require('fs');
const path = require('path');

// Configuration
const envConfig = {
    production: process.env.CONTEXT === 'production',
    supabaseUrl: process.env.NG_APP_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NG_APP_SUPABASE_API_KEY || ''
};

// Fonction pour garantir qu'un dossier existe
function ensureDirectoryExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Dossier créé : ${dir}`);
    }
}

// Fonction pour générer le fichier d'environnement
function generateEnvironmentFile(targetPath, isProduction) {
    const content = `// Fichier généré automatiquement par Netlify - ${new Date().toISOString()}
// Ne pas modifier manuellement

export const environment = {
  production: ${isProduction},
  supabaseUrl: '${envConfig.supabaseUrl}',
  supabaseKey: '${envConfig.supabaseKey}'
};
`;

    ensureDirectoryExists(targetPath);
    fs.writeFileSync(targetPath, content);
    console.log(`✅ Fichier généré : ${targetPath}`);
}

// Génération des fichiers
console.log('🚀 Démarrage de la génération des environnements...');

// Toujours générer environment.ts (développement)
generateEnvironmentFile('./src/environments/environment.ts', false);

// En production, générer aussi environment.prod.ts
if (envConfig.production) {
    generateEnvironmentFile('./src/environments/environment.prod.ts', true);
}

// Vérification optionnelle des variables
if (!envConfig.supabaseUrl || !envConfig.supabaseKey) {
    console.warn('⚠️  Attention: Variables d\'environnement Supabase manquantes!');
    console.warn('   Assurez-vous que NG_APP_SUPABASE_URL et NG_APP_SUPABASE_API_KEY sont définies sur Netlify');
} else {
    console.log('✅ Variables d\'environnement Supabase trouvées');
}

console.log('🎉 Génération des environnements terminée');