// ===== BACKGROUND ANIMATION =====
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
const PARTICLE_COUNT = 60;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 2 + 0.5;
        const colors = ['66,133,244', '52,168,83', '251,188,4', '139,92,246'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = Math.random() * 0.5 + 0.1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color},${this.alpha})`;
        ctx.fill();
    }
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
}

function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = `rgba(66,133,244,${0.08 * (1 - dist / 150)})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }
}

function animateBg() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    requestAnimationFrame(animateBg);
}
animateBg();

// ===== VIEW NAVIGATION =====
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.view;
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        views.forEach(v => {
            v.classList.remove('active');
            if (v.id === `view-${target}`) v.classList.add('active');
        });
        closePanel();
    });
});

// ===== DETAIL PANEL =====
const detailPanel = document.getElementById('detailPanel');
const panelContent = document.getElementById('panelContent');
const panelClose = document.getElementById('panelClose');

function openPanel(html) {
    panelContent.innerHTML = html;
    detailPanel.classList.add('open');
}
function closePanel() {
    detailPanel.classList.remove('open');
}
panelClose.addEventListener('click', closePanel);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

// ===== LAYER DETAIL DATA =====
const layerDetails = {
    actors: {
        title: 'Layer 1: Ecosystem Actors',
        content: `
            <p>Every participant — company, mentor, partner, programme admin — becomes a <strong>first-class entity</strong> with a rich, structured profile stored in <strong>Firestore</strong>.</p>
            <p>Unlike spreadsheet rows, these profiles contain:</p>
            <p><span class="detail-tag">Skills & Expertise</span><span class="detail-tag">Sector Tags</span><span class="detail-tag">Capacity / Availability</span><span class="detail-tag">Engagement History</span><span class="detail-tag">Eligibility Rules</span><span class="detail-tag">Geographic Region</span></p>
            <h2>Google Services</h2>
            <p><strong>Firestore</strong> — Real-time NoSQL for profiles and metadata. Sub-collections for engagement history.</p>
            <p><strong>Firebase Auth / Identity Platform</strong> — Participant authentication and role management.</p>
            <p><strong>Vertex AI Embeddings</strong> — Each profile is embedded as a vector for similarity search.</p>
        `
    },
    agents: {
        title: 'Layer 2: Specialised AI Agents',
        content: `
            <p>Rather than one monolithic AI, the system deploys <strong>four purpose-built agents</strong>, each with a clear mandate, bound to specific MCP tools.</p>
            <p><span class="detail-tag">Verification</span><span class="detail-tag">Matching</span><span class="detail-tag">Assignment</span><span class="detail-tag">Engagement</span></p>
            <h2>Google Services</h2>
            <p><strong>Vertex AI Agent Builder</strong> — Define agent goals, tool bindings, and grounding sources. Each agent is a managed deployment.</p>
            <p><strong>Gemini 2.5 Pro</strong> — The LLM backbone powering multi-step reasoning, profile analysis, and natural language interactions.</p>
            <p><strong>Cloud Workflows</strong> — Chains agents sequentially: verification → matching → assignment, with error handling and retries.</p>
        `
    },
    mcp: {
        title: 'Layer 3: MCP Servers',
        content: `
            <p>MCP (Model Context Protocol) servers expose <strong>structured, callable tools</strong> that agents use to act on ecosystem data. This is the governance layer.</p>
            <p><span class="detail-tag">Auditable</span><span class="detail-tag">Rate-limited</span><span class="detail-tag">Rule-enforced</span><span class="detail-tag">Reusable</span></p>
            <h2>Why MCP, not direct DB access?</h2>
            <p>Without MCP, agents have uncontrolled database access — hard to audit, hard to reuse across geographies. MCP enforces that an agent <strong>can't assign a company to a full cohort</strong>, and every action is logged.</p>
            <h2>Google Services</h2>
            <p><strong>Cloud Run</strong> — Each MCP server runs as a serverless container. Zero infra, auto-scales.</p>
            <p><strong>Apigee</strong> — API gateway for auth, rate limiting, and policy enforcement on all tool calls.</p>
        `
    },
    data: {
        title: 'Layer 4: Learning Data Foundation',
        content: `
            <p>Every engagement outcome feeds back into the system. Mentor ratings, milestone completions, dropout events — all stored and used to <strong>retrain matching models</strong>.</p>
            <p><span class="detail-tag">Cohort Outcomes</span><span class="detail-tag">Match Quality Scores</span><span class="detail-tag">Engagement Metrics</span><span class="detail-tag">Model Retraining</span></p>
            <h2>The Scalability Dividend</h2>
            <p>Cohort 3 runs better than Cohort 1 because the system learned what works. The more programmes run, the smarter automation becomes.</p>
            <h2>Google Services</h2>
            <p><strong>BigQuery</strong> — Centralised analytics warehouse. Stores all outcome data.</p>
            <p><strong>BigQuery ML</strong> — Train matching models directly in SQL against outcome data.</p>
            <p><strong>Vertex AI</strong> — Advanced model training and serving for compatibility scoring.</p>
            <p><strong>Looker</strong> — Dashboards for programme admins to see engagement health.</p>
        `
    }
};

// ===== LAYER CLICK HANDLERS =====
document.querySelectorAll('.arch-layer').forEach(layer => {
    layer.addEventListener('click', () => {
        const key = layer.dataset.layer;
        const detail = layerDetails[key];
        if (detail) {
            openPanel(`<h2>${detail.title}</h2>${detail.content}`);
        }
    });
});

// ===== INTERSECTION OBSERVER FOR FLOW STEPS =====
const flowSteps = document.querySelectorAll('.flow-step');
const flowObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
        }
    });
}, { threshold: 0.2 });
flowSteps.forEach(step => flowObserver.observe(step));

// ===== HOVER GLOW EFFECT ON CARDS =====
document.querySelectorAll('.arch-layer, .agent-card, .gcp-card, .flow-step').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(66,133,244,0.06), var(--bg-card) 60%)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.background = '';
    });
});

console.log('EcoLink AI — Platform Architecture loaded');
