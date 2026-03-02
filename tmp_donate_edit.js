const fs = require('fs');

let html = fs.readFileSync('frontend/donate.html', 'utf8');

// Make the body background soft slate
html = html.replace(/<body([^>]*)bg-gray-50([^>]*)>/g, '<body$1bg-slate-50$2>');
html = html.replace(/text-gray-800/g, 'text-slate-800');

// Hero section replacement
const patternHero = /<section class="relative pt-24 lg:pt-32 pb-16 lg:pb-24 bg-gray-900 text-white overflow-hidden">[\s\S]*?<div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">/;
const heroReplacement = `<section class="relative pt-32 lg:pt-40 pb-20 lg:pb-32 overflow-hidden bg-transparent">
      <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise-pattern-with-subtle-cross-lines.png')] opacity-[0.02]"></div>
      <div class="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-400/20 blur-[100px] pointer-events-none"></div>
      <div class="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-teal-400/10 blur-[100px] pointer-events-none"></div>
      
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">`;
html = html.replace(patternHero, heroReplacement);

// Hero header content
html = html.replace(
    /<span\s*class="inline-block px-4 py-2 mb-4 text-sm font-medium bg-emerald-500\/20 text-emerald-300 rounded-full border border-emerald-500\/30">\s*Make a Difference\s*<\/span>/,
    `<span
          class="inline-block px-4 py-1.5 mb-6 text-sm font-semibold text-emerald-700 bg-emerald-100/50 border border-emerald-200/50 rounded-full shadow-sm backdrop-blur-md">
          <i class="fas fa-sparkles mr-1.5 text-emerald-500"></i> High-Impact Donations
        </span>`
);

html = html.replace(
    '<h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 drop-shadow-xl">',
    '<h1 class="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-6">'
);
html = html.replace(
    'Fuel the <span class="text-emerald-400 drop-shadow-md">Movement.</span>',
    'Fuel the <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Movement.</span>'
);
html = html.replace(
    '<p class="text-xl text-gray-300 max-w-3xl mx-auto">',
    '<p class="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">'
);

// Main context box alignment
html = html.replace('<section class="relative -mt-16 z-10 pb-16 lg:pb-24">', '<section class="relative -mt-10 z-10 pb-16 lg:pb-24">');
html = html.replace(/bg-gray-50/g, 'bg-slate-50');

// Key points block
html = html.replace(
    '<div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">',
    '<div class="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 p-8">'
);

// Fix inner contents properly 
html = html.replace(
    /<div\s+class="flex-shrink-0 w-12 h-12 bg-emerald-100\/80 rounded-xl flex items-center justify-center text-emerald-600 mb-4 border border-emerald-200\/50">/g,
    '<div class="flex-shrink-0 w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100 mb-4">'
);
html = html.replace(/text-gray-900/g, 'text-slate-900');
html = html.replace(/text-gray-600/g, 'text-slate-500');

// Calculator Block - Stripe dark card look
html = html.replace(
    /<div\s*class="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 shadow-xl shadow-emerald-900\/10 text-white relative overflow-hidden">/,
    '<div class="bg-slate-900 rounded-[24px] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] text-white relative overflow-hidden ring-1 ring-slate-800/50">'
);
html = html.replace('bg-white/10 rounded-full blur-2xl', 'bg-emerald-500/10 rounded-full blur-3xl pointer-events-none');
html = html.replace(/text-emerald-100/g, 'text-slate-400');
html = html.replace(/text-emerald-200/g, 'text-slate-400');
html = html.replace('border-white/20', 'border-slate-700/50');
html = html.replace('bg-emerald-800', 'bg-slate-800 accent-emerald-500');
html = html.replace(/border-emerald-700/g, 'border-slate-700 hover:bg-slate-700');
html = html.replace(
    /class="impact-preset-btn px-4 py-2 text-sm font-medium rounded-xl bg-white\/10 hover:bg-white\/20 transition-colors border border-white\/10"/g,
    'class="impact-preset-btn px-4 py-2 text-sm font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/50"'
);

// Form block
html = html.replace(
    /<div id="donation-form-section"\s*class="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-gray-200\/50 border border-gray-100 relative">/,
    '<div id="donation-form-section"\n              class="bg-white rounded-[24px] p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 relative">'
);

// Use regex for class replacements
const formFieldsRegex1 = /class="(w-full.*?)bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-emerald-500 transition-all text-sm font-medium text-slate-800"/g;
html = html.replace(formFieldsRegex1, 'class="$1bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"');

const formFieldsRegex2 = /class="(w-full.*?)bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm font-medium text-slate-800"/g;
html = html.replace(formFieldsRegex2, 'class="$1bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"');

html = html.replace(/bg-gray-100/g, 'bg-slate-100');
html = html.replace(/bg-gray-200/g, 'bg-slate-200');
html = html.replace(/text-gray-400/g, 'text-slate-400');
html = html.replace(/text-gray-500/g, 'text-slate-500');

fs.writeFileSync('frontend/donate.html', html, 'utf8');
