const WasmBridge = {
    module: null,
    
    // Funciones exportadas
    funcs: {
        allocate_array: null,
        free_array: null,
        run_merge_sort: null,
        run_quick_sort: null,
        get_trace_ptr: null,
        get_trace_size: null,
        clear_trace: null
    },

    init: async function() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'wasm/algorithms.js';
            script.onload = () => {
                // Instanciar usando el nombre exportado
                createAlgoModule().then((mod) => {
                    this.module = mod;
                    
                    // Bind C++ functions
                    this.funcs.allocate_array = mod.cwrap('allocate_array', 'number', ['number']);
                    this.funcs.free_array = mod.cwrap('free_array', null, ['number']);
                    this.funcs.run_merge_sort = mod.cwrap('run_merge_sort', null, ['number', 'number']);
                    this.funcs.run_quick_sort = mod.cwrap('run_quick_sort', null, ['number', 'number']);
                    
                    this.funcs.get_trace_ptr = mod.cwrap('get_trace_ptr', 'number', []);
                    this.funcs.get_trace_size = mod.cwrap('get_trace_size', 'number', []);
                    this.funcs.clear_trace = mod.cwrap('clear_trace', null, []);
                    
                    console.log("WASM Module Loaded and Bound!");
                    resolve();
                }).catch(reject);
            };
            script.onerror = reject;
            document.body.appendChild(script);
        });
    },

    // Envía el arreglo de JS a C++, ordena, y devuelve las trazas
    sortAndGetTraces: function(array, algorithm) {
        if (!this.module) throw new Error("WASM no inicializado");

        const size = array.length;
        const bytesPerElement = 4; // float es 4 bytes

        // Reservar memoria en WASM
        const arrayPtr = this.funcs.allocate_array(size);

        // Escribir los valores en la memoria de WASM
        const wasmArray = new Float32Array(this.module.HEAPF32.buffer, arrayPtr, size);
        for(let i=0; i<size; i++) {
            wasmArray[i] = array[i];
        }

        // Ejecutar algoritmo
        if (algorithm === 'merge') {
            this.funcs.run_merge_sort(arrayPtr, size);
        } else if (algorithm === 'quick') {
            this.funcs.run_quick_sort(arrayPtr, size);
        }

        // Leer arreglo final (opcional, por si quieres validar)
        const sortedArray = new Float32Array(this.module.HEAPF32.buffer, arrayPtr, size);
        const jsSortedArray = Array.from(sortedArray);

        // Leer trazas
        const tracePtr = this.funcs.get_trace_ptr();
        const traceSize = this.funcs.get_trace_size();
        
        const traces = [];
        // Cada 'Step' mide 24 bytes (6 enteros de 32 bits, algunos interpretados como float)
        const INT32_SIZE = 4;
        
        for (let i = 0; i < traceSize; i++) {
            const baseIndex = (tracePtr / INT32_SIZE) + (i * 6);
            
            traces.push({
                type: this.module.HEAP32[baseIndex + 0],
                idx1: this.module.HEAP32[baseIndex + 1],
                idx2: this.module.HEAP32[baseIndex + 2],
                val1: this.module.HEAPF32[baseIndex + 3], // Float32
                val2: this.module.HEAPF32[baseIndex + 4], // Float32
                lineId: this.module.HEAP32[baseIndex + 5]
            });
        }

        // Liberar memoria
        this.funcs.free_array(arrayPtr);

        return {
            sortedArray: jsSortedArray,
            traces: traces
        };
    }
};

window.WasmBridge = WasmBridge;

// Inicializar automáticamente cuando cargue la página
function initWasm() {
    WasmBridge.init().catch(e => {
        console.error("Fallo al inicializar WASM:", e);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWasm);
} else {
    initWasm();
}
