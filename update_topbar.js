const fs = require('fs');
const path = require('path');

const files = [
    'admin-analytics.html',
    'donate.html',
    'donor.html',
    'my-donations.html',
    'ngo-claims.html',
    'volunteer-pickups.html',
    'volunteer.html'
];

const newTopbarRight = `        <div class="topbar-right">
          <label class="topbar-search flex items-center px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all" aria-label="Search dashboard">
            <i class="fa-solid fa-magnifying-glass text-gray-400"></i>
            <input type="search" placeholder="Search..." class="bg-transparent border-none outline-none ml-2 text-sm w-full focus:ring-0" autocomplete="off">
          </label>

          <button type="button" class="topbar-icon-btn topbar-notification-btn relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Notifications">
            <i class="fa-regular fa-bell text-lg"></i>
            <span class="absolute top-1 right-1 w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">3</span>
          </button>

          <div class="topbar-profile" id="topbarProfile">
            <button type="button" class="topbar-profile-btn border border-emerald-100 rounded-full px-2 py-1 flex items-center gap-2 hover:bg-emerald-50 transition-colors" id="topbarProfileBtn" aria-expanded="false"
              aria-label="Open profile menu">
              <span class="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-semibold text-sm" id="topbarAvatar">A</span>
              <span class="topbar-profile-meta hidden md:block text-left">
                <strong id="topbarUserName" class="block text-sm font-semibold text-gray-800">Account</strong>
                <small id="topbarUserRole" class="block text-xs text-gray-500">Team member</small>
              </span>
              <i class="fa-solid fa-chevron-down text-xs text-gray-400 ml-1"></i>
            </button>
            <div class="topbar-dropdown absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 hidden" id="topbarDropdown" role="menu" aria-hidden="true">
              <div class="px-4 py-3 border-b border-gray-100 mb-2 block md:hidden">
                <p class="font-semibold text-sm text-gray-800">Account</p>
                <p class="text-xs text-gray-500">Team member</p>
              </div>
              <a href="dashboard.html" class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors" role="menuitem">
                <i class="fa-regular fa-user w-4"></i> My Profile
              </a>
              <a href="index.html" class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors" role="menuitem">
                <i class="fa-solid fa-globe w-4"></i> Open Website
              </a>
              <div class="h-px bg-gray-100 my-2"></div>
              <button type="button" class="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium" id="topbarLogoutBtn" role="menuitem">
                <i class="fa-solid fa-arrow-right-from-bracket w-4"></i> Sign Out
              </button>
            </div>
          </div>
        </div>`;

files.forEach(file => {
    const filePath = path.join(__dirname, 'frontend', file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Replace topbar-right
        const regexRight = /<div class="topbar-right">[\s\S]*?(?=<\/header>)/;
        if (regexRight.test(content)) {
            content = content.replace(regexRight, newTopbarRight + '\n      ');
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${file}`);
        } else {
            console.log(`Could not find topbar-right in ${file}`);
        }
    }
});
