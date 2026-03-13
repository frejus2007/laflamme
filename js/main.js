// Supabase Configuration
const SUPABASE_URL = 'https://dkrasizfqczhalcdpjfr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrcmFzaXpmcWN6aGFsY2RwamZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDc0MzgsImV4cCI6MjA4ODkyMzQzOH0.Q-22Q3wUqUgVEeHE5mSbeT6JeiG3BnTGY38DBM4IG6Q';

// Initialize Client
// Make sure to load the CDN in HTML first: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
let supabaseClient;

try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase Client Initialized");
} catch (e) {
    console.warn("Supabase library not loaded yet or initialization failed", e);
}

// Background Canvas Embers Effect (from previous code)
document.addEventListener('DOMContentLoaded', () => {

    // --- CANVAS EFFECT ---
    const canvas = document.getElementById('embers-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const particles = [];
        const particleCount = 50;

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 1;
                this.vy = Math.random() * -2 - 0.5;
                this.size = Math.random() * 3 + 1;
                this.alpha = Math.random();
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.alpha -= 0.005;

                if (this.y < 0 || this.alpha < 0) {
                    this.y = height;
                    this.x = Math.random() * width;
                    this.alpha = Math.random();
                }
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 115, 0, ${this.alpha})`;
                ctx.fill();

                // Glow
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ff7300';
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        }

        animate();

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });
    }

    // --- MOBILE MENU ---
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('show');
        });
    }

    // --- GLOBAL SESSION / AUTH STATE ---
    const checkAuthStatus = () => {
        const sessionData = localStorage.getItem('flamme_user');
        // Find auth button in navbar (usually connexion.html)
        const allNavBtns = document.querySelectorAll('.nav-links a.btn');
        let authBtn = null;
        allNavBtns.forEach(btn => {
            if (btn.href.includes('connexion.html') || btn.textContent.trim() === 'CONNEXION') {
                authBtn = btn;
            }
        });

        if (sessionData) {
            // Auto-redirect away from auth pages if already logged in
            if (window.location.pathname.includes('connexion.html') || window.location.pathname.includes('register.html')) {
                window.location.href = 'profil.html';
                return;
            }

            if (authBtn) {
                try {
                    // User is LOGGED IN -> Change btn to DÉCONNEXION
                    authBtn.textContent = 'DÉCONNEXION';
                    authBtn.style.color = '#ff3333';
                    authBtn.style.borderColor = '#ff3333';

                    authBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        localStorage.removeItem('flamme_user');
                        window.location.reload(); // Refresh current page (which will revert it back)
                    });

                } catch (e) { console.error("Session parse error", e); }
            }
        }
    };

    checkAuthStatus();
});
