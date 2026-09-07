/**
 * wasm_bridge.js — Bridge between JavaScript and C++ WebAssembly
 * Handles memory management, function binding, and trace extraction.
 */
"use strict";

const WasmBridge = {
    module: null,
    loaded: false,
    
    funcs: {
        allocate_array: null,
        free_array: null,
        run_merge_sort: null,
        run_quick_sort: null,
        run_bubble_sort: null,
        run_binary_search: null,
        get_trace_ptr: null,
        get_trace_size: null,
        clear_trace: null
    },

    init: async function() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'wasm/algorithms.js';
            script.onload = () => {
                if (typeof createAlgoModule === 'undefined') {
                    console.warn('WASM module function not found. Falling back to JS engine.');
                    reject(new Error('createAlgoModule not defined'));
                    return;
                }
                createAlgoModule().then((mod) => {
                    this.module = mod;
                    
                    // Bind C++ functions
                    this.funcs.allocate_array   = mod.cwrap('allocate_array', 'number', ['number']);
                    this.funcs.free_array       = mod.cwrap('free_array', null, ['number']);
                    this.funcs.run_merge_sort   = mod.cwrap('run_merge_sort', null, ['number', 'number']);
                    this.funcs.run_quick_sort   = mod.cwrap('run_quick_sort', null, ['number', 'number']);
                    this.funcs.run_bubble_sort  = mod.cwrap('run_bubble_sort', null, ['number', 'number']);
                    this.funcs.run_binary_search = mod.cwrap('run_binary_search', null, ['number', 'number', 'number']);
                    
                    this.funcs.get_trace_ptr  = mod.cwrap('get_trace_ptr', 'number', []);
                    this.funcs.get_trace_size = mod.cwrap('get_trace_size', 'number', []);
                    this.funcs.clear_trace    = mod.cwrap('clear_trace', null, []);
                    
                    this.loaded = true;
                    console.log("✅ WASM Module Loaded — All 4 algorithms bound");
                    resolve();
                }).catch(reject);
            };
            script.onerror = () => {
                console.warn('WASM script failed to load. Using JS fallback.');
                reject(new Error('WASM script load error'));
            };
            document.body.appendChild(script);
        });
    },

    // Send array to C++, run algorithm, and return traces
    sortAndGetTraces: function(array, algorithm, targetVal) {
        if (!this.module || !this.loaded) {
            throw new Error("WASM no inicializado");
        }

        const size = array.length;

        // Allocate memory in WASM
        const arrayPtr = this.funcs.allocate_array(size);

        // Write values to WASM memory
        const wasmArray = new Float32Array(this.module.HEAPF32.buffer, arrayPtr, size);
        for (let i = 0; i < size; i++) {
            wasmArray[i] = array[i];
        }

        // Execute algorithm
        if (algorithm === 'merge') {
            this.funcs.run_merge_sort(arrayPtr, size);
        } else if (algorithm === 'quick') {
            this.funcs.run_quick_sort(arrayPtr, size);
        } else if (algorithm === 'bubble') {
            this.funcs.run_bubble_sort(arrayPtr, size);
        } else if (algorithm === 'binary') {
            const target = !isNaN(targetVal) ? targetVal : array[Math.floor(Math.random() * size)];
            this.funcs.run_binary_search(arrayPtr, size, target);
        }

        // Read sorted array
        const sortedArray = new Float32Array(this.module.HEAPF32.buffer, arrayPtr, size);
        const jsSortedArray = Array.from(sortedArray);

        // Read traces
        const tracePtr = this.funcs.get_trace_ptr();
        const traceSize = this.funcs.get_trace_size();
        
        const traces = [];
        const INT32_SIZE = 4;
        
        for (let i = 0; i < traceSize; i++) {
            const baseIndex = (tracePtr / INT32_SIZE) + (i * 6);
            
            traces.push({
                type: this.module.HEAP32[baseIndex + 0],
                idx1: this.module.HEAP32[baseIndex + 1],
                idx2: this.module.HEAP32[baseIndex + 2],
                val1: this.module.HEAPF32[baseIndex + 3],
                val2: this.module.HEAPF32[baseIndex + 4],
                lineId: this.module.HEAP32[baseIndex + 5]
            });
        }

        // Free memory
        this.funcs.free_array(arrayPtr);

        const result = {
            sortedArray: jsSortedArray,
            traces: traces
        };

        // For binary search, include the target
        if (algorithm === 'binary') {
            result.target = !isNaN(targetVal) ? targetVal : array[Math.floor(Math.random() * size)];
        }

        return result;
    }
};

window.WasmBridge = WasmBridge;

// Initialize WASM automatically, fall back to JS silently
function initWasm() {
    WasmBridge.init().catch(e => {
        console.warn("WASM no disponible, usando motor JavaScript como fallback:", e.message);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWasm);
} else {
    initWasm();
}
