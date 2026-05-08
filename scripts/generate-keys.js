import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const KEYS_DIR = path.join(__dirname, '..', 'electron', 'licensing', 'keys');

if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
}

console.log('Generating RSA Key Pair for Licensing System...');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

const privateKeyPath = path.join(KEYS_DIR, 'private.pem');
const publicKeyPath = path.join(KEYS_DIR, 'public.pem');

fs.writeFileSync(privateKeyPath, privateKey);
fs.writeFileSync(publicKeyPath, publicKey);

console.log('\nKeys generated successfully!');
console.log('Private Key (KEEP SECRET, NEVER SHIP THIS):', privateKeyPath);
console.log('Public Key (Shipped with app):', publicKeyPath);

// Create a TypeScript file to export the public key as a string so it gets compiled into the app easily
const pubKeyTsContent = `export const PUBLIC_KEY = \`\n${publicKey}\`;\n`;
fs.writeFileSync(path.join(KEYS_DIR, 'publicKey.ts'), pubKeyTsContent);
console.log('Generated publicKey.ts for easy import in the app.');
