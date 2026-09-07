@echo off
echo Compilando algorithms.cpp a WebAssembly...

mkdir ..\wasm 2>nul

emcc algorithms.cpp -o ../wasm/algorithms.js ^
    -s EXPORTED_FUNCTIONS="['_malloc', '_free']" ^
    -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'wasmMemory', 'HEAP8']" ^
    -s ALLOW_MEMORY_GROWTH=1 ^
    -s MODULARIZE=1 ^
    -s EXPORT_NAME="createAlgoModule" ^
    -O3

echo Compilacion terminada. Los archivos estan en la carpeta wasm/
