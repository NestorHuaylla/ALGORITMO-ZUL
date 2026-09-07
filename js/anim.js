/**
 * anim.js — Three.js 3D simulation module
 * Visualizes sorting/searching algorithms with animated 3D bars.
 * Listens to global 'algo-changed' events for algorithm selection.
 */
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    const btnLoad = document.getElementById('btn-load-sim');
    const btnPlay = document.getElementById('btn-play');
    const btnPause = document.getElementById('btn-pause');
    const btnStep = document.getElementById('btn-step');
    const inputCount = document.getElementById('sim-count');
    const inputSpeed = document.getElementById('sim-speed');
    const inputTarget = document.getElementById('sim-target');
    const progressBar = document.getElementById('sim-progress');
    const progressFill = document.getElementById('sim-progress-fill');

    let array = [];
    let traces = [];
    let currentStep = 0;
    let isPlaying = false;
    let animationId = null;
    let lastDrawTime = 0;
    let currentTarget = null;
    let currentSearchBounds = null;

    // Get current algorithm from global state
    function getCurrentAlgo() {
        return window.currentAlgorithm || 'merge';
    }

    // =====================================================
    //  THREE.JS SETUP — Premium Visual Configuration
    // =====================================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.FogExp2(0x09090b, 0.010);

    let W = container.clientWidth || 900;
    let H = container.clientHeight || 480;

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
    camera.position.set(0, 28, 65);
    camera.lookAt(0, 8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 20;
    controls.maxDistance = 160;
    controls.target.set(0, 8, 0);

    // ─── LIGHTING ─────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x18181b, 2.0));

    // Key light
    const keyLight = new THREE.DirectionalLight(0xfafafa, 2.0);
    keyLight.position.set(30, 60, 30);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 200;
    keyLight.shadow.camera.left = -60;
    keyLight.shadow.camera.right = 60;
    keyLight.shadow.camera.top = 60;
    keyLight.shadow.camera.bottom = -60;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Fill light (cool)
    const fillLight = new THREE.DirectionalLight(0x22d3ee, 0.6);
    fillLight.position.set(-40, 30, -20);
    scene.add(fillLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(0x8b5cf6, 0.8);
    rimLight.position.set(0, 20, -60);
    scene.add(rimLight);

    // Neon point lights
    const violetPoint = new THREE.PointLight(0x8b5cf6, 2.5, 80);
    violetPoint.position.set(-35, 15, 10);
    scene.add(violetPoint);

    const cyanPoint = new THREE.PointLight(0x22d3ee, 2.5, 80);
    cyanPoint.position.set(35, 15, 10);
    scene.add(cyanPoint);

    // ─── FLOOR ─────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(200, 200, 1, 1);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a0e,
        roughness: 0.95,
        metalness: 0.0
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // ─── GRID ──────────────────────────────────────────────
    const grid = new THREE.GridHelper(120, 30, 0x8b5cf6, 0x18181b);
    grid.position.y = 0.05;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    scene.add(grid);

    // ─── BARS ─────────────────────────────────────────────
    let barGroup = new THREE.Group();
    scene.add(barGroup);

    // ─── COLORS ───────────────────────────────────────────
    const STATE_COLORS = {
        highlight: { hex: 0xf43f5e, emissive: 0x7a0018, opacity: 0.92 },
        pivot:     { hex: 0xfbbf24, emissive: 0x7a5c00, opacity: 0.95 },
        dimmed:    { hex: 0x18181b, emissive: 0x000000, opacity: 0.25 },
        found:     { hex: 0x34d399, emissive: 0x115533, opacity: 1.0  },
    };

    function getNormalColor(index, total) {
        const hue = 260 + (index / total) * 100; // violet → cyan range
        const color = new THREE.Color();
        color.setHSL(hue / 360, 0.85, 0.55);
        return color;
    }

    function makeMaterial(colorKey, index, total) {
        if (colorKey === 'normal') {
            const col = getNormalColor(index, total);
            return new THREE.MeshPhongMaterial({
                color:       col,
                emissive:    col.clone().multiplyScalar(0.2),
                shininess:   100,
                specular:    new THREE.Color(0xffffff),
                transparent: true,
                opacity:     0.82,
                depthWrite:  false
            });
        }
        const c = STATE_COLORS[colorKey];
        return new THREE.MeshPhongMaterial({
            color:       c.hex,
            emissive:    c.emissive,
            shininess:   130,
            specular:    0xffffff,
            transparent: true,
            opacity:     c.opacity,
            depthWrite:  false
        });
    }

    // ─── RESIZE OBSERVER ──────────────────────────────────
    const ro = new ResizeObserver(entries => {
        for (const e of entries) {
            const w = e.contentRect.width;
            const h = e.contentRect.height;
            if (w > 0 && h > 0) {
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            }
        }
    });
    ro.observe(container);

    // ─── RENDER LOOP ──────────────────────────────────────
    function renderLoop() {
        requestAnimationFrame(renderLoop);
        const t = performance.now() * 0.001;
        violetPoint.intensity = 2.0 + Math.sin(t * 1.3) * 0.6;
        cyanPoint.intensity   = 2.0 + Math.sin(t * 1.7 + 1) * 0.6;
        controls.update();
        renderer.render(scene, camera);
    }
    renderLoop();

    // ─── DRAW BARS ────────────────────────────────────────
    function drawArray3D(highlights = [], pivotIdx = -1, searchBounds = null, foundIdx = -1) {
        while (barGroup.children.length) {
            const c = barGroup.children[0];
            barGroup.remove(c);
            c.geometry.dispose();
            c.material.dispose();
        }

        if (!array.length) return;

        const n = array.length;
        const maxVal = Math.max(...array);
        const totalWidth = 70;
        const barW = totalWidth / n;
        const gap = barW * 0.15;
        const actualW = barW - gap;
        const startX = -totalWidth / 2;

        for (let i = 0; i < n; i++) {
            const val = array[i];
            const h = Math.max(0.5, (val / maxVal) * 35);

            let colorKey = 'normal';
            if (i === foundIdx)              colorKey = 'found';
            else if (i === pivotIdx)        colorKey = 'pivot';
            else if (highlights.includes(i)) colorKey = 'highlight';
            else if (searchBounds && (i < searchBounds.left || i > searchBounds.right))
                colorKey = 'dimmed';

            const geo = new THREE.BoxGeometry(actualW, h, actualW);
            const mat = makeMaterial(colorKey, i, n);

            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = false;
            mesh.position.set(startX + i * barW + barW / 2, h / 2, 0);
            barGroup.add(mesh);
        }
    }

    // ─── UPDATE PROGRESS BAR ─────────────────────────────
    function updateProgress() {
        if (traces.length === 0) {
            progressBar.classList.remove('active');
            return;
        }
        progressBar.classList.add('active');
        const pct = Math.min(100, (currentStep / traces.length) * 100);
        progressFill.style.width = pct + '%';
    }

    // ─── LOAD DATA ────────────────────────────────────────
    btnLoad.addEventListener('click', async () => {
        const count = Math.min(parseInt(inputCount.value) || 50, 200);
        const algo = getCurrentAlgo();

        const products = await window.appDb.getProductsPaginated(0, count);
        if (!products.length) { alert('No hay productos en la base de datos. Genera datos primero en la pestaña Datos.'); return; }

        array = products.map(p => p.price);

        try {
            const userTarget = parseFloat(inputTarget.value);
            const result = window.AlgorithmsEngine.sortAndGetTraces(array, algo, userTarget);

            array = result.sortedArray;
            traces = result.traces;
            currentTarget = result.target;
            if (algo === 'binary' && inputTarget) inputTarget.value = currentTarget;

            currentStep = 0;
            isPlaying = false;
            currentSearchBounds = null;

            drawArray3D();
            updateProgress();

            // Reset camera
            camera.position.set(0, 28, 65);
            controls.target.set(0, 8, 0);

            // Update Module C counters
            ['merge','quick','bubble','binary'].forEach(a => {
                const el = document.getElementById(`lbl-${a}-ops`);
                if (el) el.textContent = '—';
            });
            const opEl = document.getElementById(`lbl-${algo}-ops`);
            if (opEl) opEl.textContent = traces.length.toLocaleString();

            btnPlay.disabled = false;
            btnStep.disabled = false;
            btnPause.disabled = true;

        } catch (err) {
            console.error(err);
            alert('Error ejecutando el algoritmo: ' + err.message);
        }
    });

    // ─── LISTEN TO GLOBAL ALGO CHANGE ────────────────────
    window.addEventListener('algo-changed', () => {
        // Reset simulation state when algorithm changes
        traces = [];
        currentStep = 0;
        isPlaying = false;
        currentSearchBounds = null;
        if (animationId) cancelAnimationFrame(animationId);

        btnPlay.disabled = true;
        btnStep.disabled = true;
        btnPause.disabled = true;

        updateProgress();

        // Clear 3D bars if array exists, redraw neutral
        if (array.length) {
            drawArray3D();
        }
    });

    // ─── STEP LOGIC ───────────────────────────────────────
    function applyStep(idx) {
        if (idx >= traces.length) return;
        const step = traces[idx];
        const algo = getCurrentAlgo();

        if (step.type === 2) {
            // Swap
            if (step.idx1 >= 0 && step.idx1 < array.length &&
                step.idx2 >= 0 && step.idx2 < array.length) {
                [array[step.idx1], array[step.idx2]] = [array[step.idx2], array[step.idx1]];
            }
        } else if (step.type === 3) {
            // Overwrite
            if (step.idx1 >= 0 && step.idx1 < array.length) {
                array[step.idx1] = step.val1;
            }
        } else if (algo === 'binary' && step.type === 0) {
            currentSearchBounds = { left: step.idx1, right: step.idx2 };
        }

        window.dispatchEvent(new CustomEvent('algo-step', { detail: step }));

        let pivotIdx = -1, foundIdx = -1, highlights = [];

        if (algo === 'binary') {
            if (step.type === 4)      { pivotIdx = step.idx1; highlights = [step.idx1]; }
            else if (step.type === 1) { highlights = [step.idx1]; }
            else if (step.type === 5) { foundIdx = step.idx1; }
        } else {
            if (step.type === 4) pivotIdx = step.idx1;
            if (algo === 'quick' && step.type === 1 && pivotIdx === -1) pivotIdx = step.idx2;
            if (step.type !== 0 && step.idx1 !== -1 && step.idx2 !== -1)
                highlights = [step.idx1, step.idx2];
        }

        drawArray3D(highlights, pivotIdx, currentSearchBounds, foundIdx);
        updateProgress();
    }

    // ─── SIMULATION LOOP ─────────────────────────────────
    function simLoop(ts) {
        if (!isPlaying) return;

        const spd = parseInt(inputSpeed.value);
        const delay = 1000 * Math.pow(0.01, (spd - 1) / 99);

        if (ts - lastDrawTime > delay) {
            if (currentStep < traces.length) {
                applyStep(currentStep++);
                lastDrawTime = ts;
            } else {
                isPlaying = false;
                btnPlay.disabled = false;
                btnPause.disabled = true;
                btnStep.disabled = false;
                currentSearchBounds = null;
                drawArray3D();
                updateProgress();
            }
        }
        if (isPlaying) animationId = requestAnimationFrame(simLoop);
    }

    btnPlay.addEventListener('click', () => {
        if (currentStep >= traces.length) { currentStep = 0; currentSearchBounds = null; }
        isPlaying = true;
        btnPlay.disabled = true;
        btnPause.disabled = false;
        btnStep.disabled = true;
        lastDrawTime = performance.now();
        animationId = requestAnimationFrame(simLoop);
    });

    btnPause.addEventListener('click', () => {
        isPlaying = false;
        cancelAnimationFrame(animationId);
        btnPlay.disabled = false;
        btnPause.disabled = true;
        btnStep.disabled = false;
    });

    btnStep.addEventListener('click', () => {
        if (currentStep < traces.length) applyStep(currentStep++);
    });
});
