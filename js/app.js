/**
 * app.js — Core application logic
 * Handles tab navigation and global algorithm selection with event dispatch.
 */
"use strict";

document.addEventListener('DOMContentLoaded', () => {
    // ─── TAB NAVIGATION ──────────────────────────────────
    const tabBtns = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.module-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            sections.forEach(sec => sec.classList.remove('active'));
            const targetId = btn.getAttribute('data-target');
            const target = document.getElementById(targetId);
            if (target) target.classList.add('active');
        });
    });

    // ─── GLOBAL ALGORITHM SELECTOR ───────────────────────
    const algoCards = document.querySelectorAll('.algo-card');
    const complexityCards = document.querySelectorAll('.complexity-card');

    // Track current algorithm globally
    window.currentAlgorithm = 'merge';

    algoCards.forEach(card => {
        card.addEventListener('click', () => {
            const algo = card.dataset.algo;
            if (algo === window.currentAlgorithm) return;

            // Update visual state
            algoCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            // Update complexity cards
            complexityCards.forEach(c => c.classList.remove('active'));
            const matchingComplexityCard = document.querySelector(`.complexity-card[data-algo="${algo}"]`);
            if (matchingComplexityCard) matchingComplexityCard.classList.add('active');

            // Update global state
            window.currentAlgorithm = algo;

            // Show/hide binary search target input
            const searchContainer = document.getElementById('search-target-container');
            if (searchContainer) {
                searchContainer.style.display = algo === 'binary' ? 'flex' : 'none';
            }

            // Dispatch global event
            window.dispatchEvent(new CustomEvent('algo-changed', {
                detail: { algorithm: algo }
            }));
        });
    });
});
