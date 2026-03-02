const fs = require('fs');
const files = fs.readdirSync('frontend').filter(f => f.endsWith('.html'));
const missingSrcs = new Set();
files.forEach(file => {
    const content = fs.readFileSync('frontend/' + file, 'utf8');
    const srcs = content.match(/src="([^"]+)"/g) || [];
    srcs.forEach(src => {
        const path = src.replace(/src="\|"/g, '');
        if (!path.startsWith('http') && !fs.existsSync('frontend/' + path.split('?')[0])) {
            missingSrcs.add(`[${file}] -> ${path}`);
        }
    });

    const hrefs = content.match(/href="([^"]+)"/g) || [];
    hrefs.forEach(href => {
        const path = href.replace(/href="\|"/g, '');
        if (!path.startsWith('http') && !path.startsWith('#') && !path.startsWith('mailto') && !fs.existsSync('frontend/' + path.split('?')[0])) {
            missingSrcs.add(`[${file}] -> ${path}`);
        }
    });
});
console.log('Missing resources:', Array.from(missingSrcs));
