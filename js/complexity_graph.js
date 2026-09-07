/**
 * complexity_graph.js — Canvas 2D Cartesian plane for algorithm complexity visualization
 * Draws f(n) curves for each algorithm with animation and interactive highlighting.
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('complexity-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animProgress = 0;
    let animId = null;
    let activeAlgo = 'merge';
    let hoveredAlgo = null;

    // ─── CONFIGURATION ──────────────────────────────────
    const ALGORITHMS = {
        merge:  { label: 'Merge Sort',    fn: n => n * Math.log2(Math.max(n, 1)),  color: '#8b5cf6', formula: 'f(n) = n · log₂(n)' },
        quick:  { label: 'Quick Sort',    fn: n => n * Math.log2(Math.max(n, 1)),  color: '#22d3ee', formula: 'f(n) = n · log₂(n)  avg' },
        bubble: { label: 'Bubble Sort',   fn: n => n * n,                           color: '#f43f5e', formula: 'f(n) = n²' },
        binary: { label: 'Binary Search', fn: n => Math.log2(Math.max(n, 1)),       color: '#34d399', formula: 'f(n) = log₂(n)' },
    };

    // Extra curve: Quick Sort worst case
    const QUICK_WORST = { label: 'Quick (Worst)', fn: n => n * n, color: 'rgba(34,211,238,0.25)', formula: 'f(n) = n²  worst' };

    const PADDING = { top: 30, right: 30, bottom: 50, left: 65 };
    const MAX_N = 100;

    // ─── SIZING ──────────────────────────────────────────
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
    }

    // ─── COORDINATE MAPPING ──────────────────────────────
    function getPlotArea() {
        const rect = canvas.parentElement.getBoundingClientRect();
        return {
            x: PADDING.left,
            y: PADDING.top,
            w: rect.width - PADDING.left - PADDING.right,
            h: rect.height - PADDING.top - PADDING.bottom,
        };
    }

    function getMaxY() {
        // Max Y across all visible algorithms at MAX_N
        let max = 0;
        for (const key of Object.keys(ALGORITHMS)) {
            const val = ALGORITHMS[key].fn(MAX_N);
            if (val > max) max = val;
        }
        return max * 1.1;
    }

    function mapX(n, plot) {
        return plot.x + (n / MAX_N) * plot.w;
    }

    function mapY(val, plot, maxY) {
        return plot.y + plot.h - (val / maxY) * plot.h;
    }

    // ─── DRAW ────────────────────────────────────────────
    function draw() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const W = rect.width;
        const H = rect.height;
        const plot = getPlotArea();
        const maxY = getMaxY();

        // Clear
        ctx.clearRect(0, 0, W, H);

        // Background
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, W, H);

        drawGrid(plot, maxY, W, H);
        drawAxes(plot, maxY, W, H);
        drawCurves(plot, maxY);
        drawLabels(plot, maxY, W, H);
    }

    function drawGrid(plot, maxY, W, H) {
        ctx.strokeStyle = '#1a1a1f';
        ctx.lineWidth = 1;

        // Vertical grid lines
        const xStep = MAX_N / 10;
        for (let n = xStep; n <= MAX_N; n += xStep) {
            const x = mapX(n, plot);
            ctx.beginPath();
            ctx.moveTo(x, plot.y);
            ctx.lineTo(x, plot.y + plot.h);
            ctx.stroke();
        }

        // Horizontal grid lines
        const yLines = 8;
        const yStep = maxY / yLines;
        for (let i = 1; i <= yLines; i++) {
            const y = mapY(yStep * i, plot, maxY);
            ctx.beginPath();
            ctx.moveTo(plot.x, y);
            ctx.lineTo(plot.x + plot.w, y);
            ctx.stroke();
        }
    }

    function drawAxes(plot, maxY, W, H) {
        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 1.5;

        // X axis
        ctx.beginPath();
        ctx.moveTo(plot.x, plot.y + plot.h);
        ctx.lineTo(plot.x + plot.w, plot.y + plot.h);
        ctx.stroke();

        // Y axis
        ctx.beginPath();
        ctx.moveTo(plot.x, plot.y);
        ctx.lineTo(plot.x, plot.y + plot.h);
        ctx.stroke();

        // Arrow heads
        ctx.fillStyle = '#3f3f46';
        // Y arrow
        ctx.beginPath();
        ctx.moveTo(plot.x - 4, plot.y + 6);
        ctx.lineTo(plot.x, plot.y - 2);
        ctx.lineTo(plot.x + 4, plot.y + 6);
        ctx.fill();
        // X arrow
        ctx.beginPath();
        ctx.moveTo(plot.x + plot.w - 6, plot.y + plot.h - 4);
        ctx.lineTo(plot.x + plot.w + 2, plot.y + plot.h);
        ctx.lineTo(plot.x + plot.w - 6, plot.y + plot.h + 4);
        ctx.fill();
    }

    function drawLabels(plot, maxY, W, H) {
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#71717a';

        // X labels
        const xStep = MAX_N / 10;
        for (let n = 0; n <= MAX_N; n += xStep) {
            const x = mapX(n, plot);
            ctx.fillText(n.toString(), x, plot.y + plot.h + 8);
        }

        // X axis label
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText('n (elementos)', plot.x + plot.w / 2, plot.y + plot.h + 30);

        // Y labels
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = '10px "Fira Code", monospace';
        const yLines = 8;
        const yStep = maxY / yLines;
        for (let i = 0; i <= yLines; i++) {
            const val = yStep * i;
            const y = mapY(val, plot, maxY);
            let label;
            if (val >= 1000) label = (val / 1000).toFixed(1) + 'k';
            else label = Math.round(val).toString();
            ctx.fillText(label, plot.x - 8, y);
        }

        // Y axis label
        ctx.save();
        ctx.translate(14, plot.y + plot.h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#71717a';
        ctx.fillText('operaciones', 0, 0);
        ctx.restore();
    }

    function drawCurves(plot, maxY) {
        const progress = animProgress;

        // Draw Quick worst case first (background)
        if (activeAlgo === 'quick') {
            drawSingleCurve(QUICK_WORST.fn, QUICK_WORST.color, plot, maxY, progress, false, true);
        }

        // Draw all algorithm curves
        const algoKeys = Object.keys(ALGORITHMS);
        for (const key of algoKeys) {
            const algo = ALGORITHMS[key];
            const isActive = key === activeAlgo;
            const isHovered = key === hoveredAlgo;
            const dimmed = !isActive && !isHovered;
            drawSingleCurve(algo.fn, algo.color, plot, maxY, progress, isActive, dimmed);
        }
    }

    function drawSingleCurve(fn, color, plot, maxY, progress, glow, dimmed) {
        const steps = Math.floor(MAX_N * progress);
        if (steps < 2) return;

        ctx.save();

        // Glow effect for active algorithm
        if (glow) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;
        }

        ctx.strokeStyle = dimmed ? hexToRgba(color, 0.15) : color;
        ctx.lineWidth = glow ? 2.5 : (dimmed ? 1 : 1.5);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (dimmed) {
            ctx.setLineDash([4, 4]);
        }

        ctx.beginPath();
        for (let n = 1; n <= steps; n++) {
            const x = mapX(n, plot);
            const y = mapY(fn(n), plot, maxY);
            if (n === 1) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw endpoint dot for active
        if (glow && steps > 0) {
            const lastX = mapX(steps, plot);
            const lastY = mapY(fn(steps), plot, maxY);
            ctx.beginPath();
            ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Value label at endpoint
            const val = fn(steps);
            ctx.font = '10px "Fira Code", monospace';
            ctx.fillStyle = color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            let label;
            if (val >= 1000) label = (val / 1000).toFixed(1) + 'k';
            else label = Math.round(val).toString();
            ctx.fillText(label, lastX + 8, lastY - 4);
        }

        ctx.restore();
    }

    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    // ─── ANIMATION ───────────────────────────────────────
    function animateCurves() {
        if (animId) cancelAnimationFrame(animId);
        animProgress = 0;

        function step() {
            animProgress += 0.015;
            if (animProgress > 1) animProgress = 1;
            draw();
            if (animProgress < 1) {
                animId = requestAnimationFrame(step);
            }
        }
        animId = requestAnimationFrame(step);
    }

    // ─── EVENTS ──────────────────────────────────────────
    window.addEventListener('algo-changed', (e) => {
        activeAlgo = e.detail.algorithm;
        updateFormula();
        animateCurves();
    });

    // Legend hover
    document.querySelectorAll('.legend-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            hoveredAlgo = item.dataset.algo;
            draw();
        });
        item.addEventListener('mouseleave', () => {
            hoveredAlgo = null;
            draw();
        });
    });

    function updateFormula() {
        const el = document.getElementById('formula-display');
        if (el && ALGORITHMS[activeAlgo]) {
            el.textContent = ALGORITHMS[activeAlgo].formula;
        }
    }

    // ─── INIT ────────────────────────────────────────────
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas.parentElement);

    updateFormula();
    // Initial draw with animation
    setTimeout(() => {
        resize();
        animateCurves();
    }, 100);
});
