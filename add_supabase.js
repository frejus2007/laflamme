const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname);

function prependSupabase(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            prependSupabase(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const cdnTags = `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`;

            // Avoid duplicate additions
            if (!content.includes(cdnTags)) {
                content = content.replace(/<script src="js\/main\.js"><\/script>/g, `${cdnTags}\n    <script src="js/main.js"></script>`);
                content = content.replace(/<script src="\.\.\/js\/main\.js"><\/script>/g, `${cdnTags}\n    <script src="../js/main.js"></script>`);
                content = content.replace(/<script src="\.\.\/js\/admin\.js"><\/script>/g, `${cdnTags}\n    <script src="../js/admin.js"></script>`);
                content = content.replace(/<script src="js\/admin\.js"><\/script>/g, `${cdnTags}\n    <script src="js/admin.js"></script>`);

                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    });
}

prependSupabase(directoryPath);
