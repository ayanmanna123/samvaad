import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.model('User', new mongoose.Schema({ 
        name: String, 
        email: String,
        settings: { syncContactsEnabled: Boolean },
        contacts: Array
    }));
    
    const targetEmail = 'mannaayan777@gmail.com';
    const user = await User.findOne({ email: targetEmail });
    
    if (user) {
        console.log(`User: ${user.name} (${user.email})`);
        console.log(`Sync Enabled: ${user.settings?.syncContactsEnabled}`);
        console.log(`Contacts Count: ${user.contacts?.length || 0}`);
        console.log('Contacts:', JSON.stringify(user.contacts, null, 2));
    } else {
        console.log('User not found');
    }
    
    const others = await User.find({ email: { $ne: targetEmail } });
    console.log('Other Users in DB:', others.map(o => o.email));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
