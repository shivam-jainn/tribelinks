const fs = require('fs');
const path = './apps/web/src/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Colors replacement
content = content
  .replace(/bg-black/g, 'bg-white')
  .replace(/bg-\[#0b0b0e\]/g, 'bg-white')
  .replace(/bg-\[#0a0a0d\]/g, 'bg-white')
  .replace(/text-white/g, 'text-zinc-900')
  .replace(/text-zinc-100/g, 'text-zinc-900')
  .replace(/text-zinc-200/g, 'text-zinc-800')
  .replace(/text-zinc-300/g, 'text-zinc-700')
  .replace(/text-zinc-400/g, 'text-zinc-500')
  .replace(/border-zinc-900/g, 'border-zinc-200')
  .replace(/border-zinc-800/g, 'border-zinc-200')
  .replace(/border-zinc-850/g, 'border-zinc-200')
  .replace(/bg-zinc-900/g, 'bg-zinc-50')
  .replace(/bg-zinc-950/g, 'bg-zinc-100')
  .replace(/bg-black\/60/g, 'bg-white/80')
  .replace(/bg-black\/40/g, 'bg-zinc-50')
  .replace(/bg-zinc-100/g, 'bg-zinc-900') // Buttons bg-zinc-100 -> bg-zinc-900
  .replace(/text-black/g, 'text-white') // Buttons text-black -> text-white
  .replace(/text-zinc-500/g, 'text-zinc-500')
  .replace(/hover:bg-zinc-200/g, 'hover:bg-zinc-800')
  .replace(/hover:bg-zinc-900/g, 'hover:bg-zinc-100')
  .replace(/text-zinc-900 font-semibold text-lg/g, 'text-zinc-900 font-semibold text-lg'); // adjust logo text back if needed

// Gradients / Accents cleanup
content = content
  .replace(/bg-orange-700\/5/g, 'bg-transparent')
  .replace(/bg-blue-500\/5/g, 'bg-transparent')
  .replace(/text-orange-500/g, 'text-zinc-900')
  .replace(/text-orange-400/g, 'text-zinc-900')
  .replace(/border-orange-700\/20/g, 'border-zinc-200')
  .replace(/bg-orange-950\/10/g, 'bg-zinc-100')
  .replace(/bg-orange-950\/20/g, 'bg-zinc-100')
  .replace(/hover:bg-orange-950\/20/g, 'hover:bg-zinc-200')
  .replace(/border-orange-900\/30/g, 'border-zinc-200')
  .replace(/border-orange-700/g, 'border-zinc-300')
  .replace(/text-sky-400/g, 'text-zinc-900')
  .replace(/text-sky-500/g, 'text-zinc-900')
  .replace(/bg-sky-950\/20/g, 'bg-zinc-100')
  .replace(/bg-sky-950\/40/g, 'bg-zinc-100')
  .replace(/border-sky-900\/40/g, 'border-zinc-200')
  .replace(/border-sky-900\/30/g, 'border-zinc-200')
  .replace(/text-emerald-400/g, 'text-emerald-600')
  .replace(/bg-emerald-500\/5/g, 'bg-emerald-50')
  .replace(/border-emerald-500\/20/g, 'border-emerald-200')
  .replace(/bg-sky-700/g, 'bg-zinc-900') // progress bars
  .replace(/hover:border-sky-500\/30/g, 'hover:border-zinc-300')
  .replace(/hover:border-orange-500\/30/g, 'hover:border-zinc-300')
  .replace(/hover:border-indigo-500\/30/g, 'hover:border-zinc-300');

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced colors in page.tsx');
