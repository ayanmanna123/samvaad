import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, ShieldCheck, ArrowRight, ShieldAlert, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const ContactSyncGateway = ({ children }) => {
    const { user, syncContacts, updateSettings } = useAuth();
    const [syncing, setSyncing] = useState(false);

    const isSupported = 'contacts' in navigator && 'ContactsManager' in window;
    
    // Only force sync if the feature is enabled, no contacts exist, AND the browser actually supports it (mobile)
    const needsSync = user?.settings?.syncContactsEnabled && (!user?.contacts || user?.contacts.length === 0) && isSupported;

    const handleSync = async () => {
        if (!isSupported) {
            alert('Contact sync is only supported on mobile browsers (Chrome/Android). As a desktop user, you can manually add contacts in settings or use global search.');
            return;
        }

        try {
            setSyncing(true);
            const props = ['name', 'email', 'tel'];
            const opts = { multiple: true };
            const deviceContacts = await navigator.contacts.select(props, opts);

            if (deviceContacts.length > 0) {
                await syncContacts(deviceContacts);
            }
        } catch (err) {
            console.error('Contact selection failed:', err);
        } finally {
            setSyncing(false);
        }
    };

    const handleDisableSync = async () => {
        await updateSettings({ syncContactsEnabled: false });
    };

    if (!needsSync) return children;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-wa-surface">
            <div className="w-full max-w-md px-8 py-12 flex flex-col items-center text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 rounded-[32px] bg-wa-accent/10 flex items-center justify-center mb-8"
                >
                    <Smartphone size={48} className="text-wa-accent" />
                </motion.div>

                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl font-black mb-4 tracking-tight"
                    style={{ color: 'hsl(var(--sv-text))' }}
                >
                    Message your contacts
                </motion.h1>

                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm leading-relaxed mb-10 text-wa-text-secondary"
                >
                    To keep Samvaad private, you can only message people from your phone contacts. Sync them now to see who's already here!
                </motion.p>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="w-full space-y-4"
                >
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="w-full py-4 rounded-2xl bg-wa-accent text-white font-bold text-lg shadow-xl shadow-wa-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {syncing ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><Smartphone size={20} /> Sync Device Contacts</>
                        )}
                    </button>

                    <div className="flex items-center gap-2 p-4 rounded-xl bg-wa-accent/5 border border-wa-accent/10">
                        <ShieldCheck size={16} className="text-wa-accent" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-wa-accent">
                            End-to-end encrypted & Privacy focused
                        </span>
                    </div>
                </motion.div>

                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ delay: 1 }}
                    onClick={handleDisableSync}
                    className="mt-8 text-xs font-bold uppercase tracking-widest hover:opacity-100 transition-opacity"
                    style={{ color: 'hsl(var(--sv-text-3))' }}
                >
                    Use global search instead (Not Recommended)
                </motion.button>
            </div>
        </div>
    );
};

export default ContactSyncGateway;
