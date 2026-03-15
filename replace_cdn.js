const fs = require('fs');
const path = require('path');

function replaceCDN(dir, depth = 0) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory() && !['.git', 'css', 'js', 'images'].includes(file)) {
            replaceCDN(fullPath, depth + 1);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const cdnTag = /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>/g;
            const prefix = depth > 0 ? '../'.repeat(depth) : '';
            const localTag = `<script src="${prefix}js/supabase.js"></script>`;
            if (content.match(cdnTag)) {
                content = content.replace(cdnTag, localTag);
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated ' + fullPath);
            }
        }
    });
}
replaceCDN(__dirname);
