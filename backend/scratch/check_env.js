import 'dotenv/config';

console.log('--- ImageKit Var Check ---');
console.log('PUBLIC KEY length:', process.env.IMAGEKIT_PUBLIC_KEY?.length || 0);
console.log('PRIVATE KEY length:', process.env.IMAGEKIT_PRIVATE_KEY?.length || 0);
console.log('URL ENDPOINT:', process.env.IMAGEKIT_URL_ENDPOINT);

const pub = process.env.IMAGEKIT_PUBLIC_KEY || '';
const priv = process.env.IMAGEKIT_PRIVATE_KEY || '';

console.log('PUBLIC KEY (masked):', pub.substring(0, 10) + '...');
console.log('PRIVATE KEY (masked):', priv.substring(0, 10) + '...');
