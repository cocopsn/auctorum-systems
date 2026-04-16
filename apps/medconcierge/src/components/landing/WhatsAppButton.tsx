'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

export default function WhatsAppButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <a href="/agendar" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="group flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full shadow-xl shadow-green-900/30 transition-all duration-300 hover:shadow-2xl hover:shadow-green-900/40">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="w-14 h-14 flex items-center justify-center"><MessageCircle className="w-7 h-7 fill-white" /></motion.div>
        <AnimatePresence>{hovered && (<motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="font-bold text-sm whitespace-nowrap pr-5 overflow-hidden">Agendar cita</motion.span>)}</AnimatePresence>
      </a>
    </div>
  );
}
