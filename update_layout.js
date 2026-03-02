const fs = require('fs');
const path = require('path');

const files = [
    'admin-analytics.html',
    'donate.html',
    'my-donations.html',
    'ngo-claims.html',
    'volunteer-pickups.html',
    'donor.html',
    'volunteer.html'
];

files.forEach(file => {
    const filePath = path.join(__dirname, 'frontend', file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Replace the main topbar container
        const headerRegex = /<header class="dashboard-topbar">([\s\S]*?)<\/header>/;
        const match = content.match(headerRegex);

        if (match) {
            let innerHTML = match[1];

            // Left section
            const leftRegex = /<div class="topbar-left">[\s\S]*?<\/div>\s*<div class="topbar-right">/;

            let newLeft = innerHTML;
            const leftMatch = innerHTML.match(/<div class="topbar-left">([\s\S]*?)<\/div>\s*<div class="topbar-right">/);

            if (leftMatch) {
                let titleWrap = leftMatch[1].match(/<div class="topbar-title-wrap">([\s\S]*?)<\/div>/);
                if (titleWrap) {
                    // Keep the heading text if possible
                    const headingMatch = titleWrap[1].match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
                    const headingText = headingMatch ? headingMatch[1].trim() : "Dashboard";

                    let subtitleText = "Here is your overview.";
                    if (file === "admin-analytics.html") subtitleText = "Global metrics across the platform.";
                    else if (file === "donate.html") subtitleText = "Make a new donation.";
                    else if (file === "my-donations.html") subtitleText = "Track your donation history.";
                    else if (file === "ngo-claims.html") subtitleText = "Review and claim available donations.";
                    else if (file === "volunteer-pickups.html") subtitleText = "Manage your assigned pickups.";

                    const newTitleWrap = `<div class="topbar-title-wrap">
            <h1 class="text-xl font-bold text-gray-900" data-page-heading>${headingText}</h1>
            <p class="text-sm text-gray-500">${subtitleText}</p>
          </div>`;

                    const newLeftStr = `<div class="topbar-left">
          <button type="button" class="sidebar-mobile-toggle" id="sidebarMobileToggle" aria-label="Open sidebar">
            <i class="fa-solid fa-bars"></i>
          </button>
          ${newTitleWrap}
        </div>\n        <div class="topbar-right">`;

                    innerHTML = innerHTML.replace(leftRegex, newLeftStr);
                }
            }

            content = content.replace(headerRegex, `<header class="dashboard-topbar">\n${innerHTML}</header>`);

            // Update page-card and main classes if it's admin or list pages (not just dashboard which is already new)
            if (file !== 'dashboard.html' && file !== 'donor.html') {
                content = content.replace(/<main class="dashboard-main">/, '<main class="dashboard-main p-8 bg-gray-50 min-h-screen">');
                content = content.replace(/<div class="dashboard-content">/, '<div class="dashboard-content max-w-[1400px] mx-auto space-y-6">');
                content = content.replace(/<section class="card-surface page-card">/, '<section class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm page-card">');

                content = content.replace(/<div class="page-toolbar">/, '<div class="page-toolbar flex justify-between items-center mb-6">');

                // Fix page-heading
                content = content.replace(/<h2 class="page-heading">([\s\S]*?)<\/h2>/, '<h2 class="text-lg font-bold text-gray-900 page-heading border-none pb-0">$1</h2>');
                content = content.replace(/<p class="page-subtitle">([\s\S]*?)<\/p>/, '<p class="text-sm text-gray-500 page-subtitle">$1</p>');

                // Re-style buttons in table tools
                content = content.replace(/<button([^>]*)class="secondary-btn"([^>]*)>(.*?)<\/button>/g, '<button$1class="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm secondary-btn"$2>$3</button>');
                content = content.replace(/<button([^>]*)class="primary-btn"([^>]*)>(.*?)<\/button>/g, '<button$1class="px-4 py-2 bg-emerald-600 border border-transparent rounded-xl text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm primary-btn"$2>$3</button>');

            }

            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated layout for ${file}`);
        } else {
            console.log(`Could not find header in ${file}`);
        }
    }
});
