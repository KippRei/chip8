/// Chip-8 Emulator/Interpreter built using high-level walkthrough from Tobias V. Langhoff (https://tobiasvl.github.io/blog/write-a-chip-8-emulator/)

// Screen Element and Canvas
const screenWidth = 64;
const screenHeight = 32;
let screen;
let canvas;

// Start button and user CPU frequency
let startBtn;
let userCPUFreq;

// CPU frequency (cycles per second)
let cpuFreq = 500;

onload = () => {
    screen = document.getElementById("screen");
    canvas = screen.getContext("2d", { willReadFrequently: true});
    userCPUFreq = document.getElementById("cpuFreq");
    userCPUFreq.value = cpuFreq;
}

// Start program
function startProgram() {
    if (userCPUFreq.value > 0) {
        cpuFreq = userCPUFreq.value;
    }
    getFile();
}

// File buffer
async function getFile() {
    //const fileName = "IBM-Logo.ch8";
    //const fileName = "danm8ku.ch8";
   const fileName = "test_opcode.ch8";

    try {
        const res = await fetch(fileName);
        if (!res.ok) {
            throw new Error(res.status);
        }
        let buffer = await res.arrayBuffer();
        const byteLen = buffer.byteLength;
        readROMToMemory(buffer, byteLen);
    }
    catch (err){
        console.error(err.message);
    }
}

// Memory
let memory = new Array(4096).fill(0);

// Read ROM file into memory then start loop
function readROMToMemory(buffer, length) {
    let memLocation = 0x200;
    const byteArr = new Uint8Array(buffer, 0, length);
    for (let i = 0; i < length; i++) {
        memory[memLocation + i] =  byteArr[i];
    }
    
    startLoop();
}

// Font
const font = new Array(
0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
0x20, 0x60, 0x20, 0x20, 0x70, // 1
0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
0x90, 0x90, 0xF0, 0x10, 0x10, // 4
0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
0xF0, 0x10, 0x20, 0x40, 0x40, // 7
0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
0xF0, 0x90, 0xF0, 0x90, 0x90, // A
0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
0xF0, 0x80, 0x80, 0x80, 0xF0, // C
0xE0, 0x90, 0x90, 0x90, 0xE0, // D
0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
0xF0, 0x80, 0xF0, 0x80, 0x80  // F
);

// Load font into memory starting at 0x050 (through 0x09F)
let i = 0x050;
font.forEach(e => {
    memory[i] = e;
    i++;
});

// Stack
let stack = [];

// General registers
let vReg = new Array(16);

// Timer and sound registers (60hz)
let _timer = 0,_sound = 0;
let time = Date.now();

// Input
onkeydown = (e => {
    switch(e.code) {
        case "Digit1":
            fetchOp();
            // console.log("1");
            break;
        case "Digit2":
            // console.log("2");
            break;
        case "Digit3":
            // console.log("3");
            break;
        case "Digit4":
            // console.log("C");
            break;
        case "KeyQ":
            // console.log("4");
            break;
        case "KeyW":
            // console.log("5");
            break;
        case "KeyE":
            // console.log("6");
            break;
        case "KeyR":
            // console.log("D");
            break;
        case "KeyA":
            // console.log("7");
            break;
        case "KeyS":
            // console.log("8");
            break;
        case "KeyD":
            // console.log("9");
            break;
        case "KeyF":
            // console.log("E");
            break;
        case "KeyZ":
            // console.log("A");
            break;
        case "KeyX":
            // console.log("0");
            break;
        case "KeyC":
            // console.log("B");
            break;
        case "KeyV":
            // console.log("F");
            break;
    }
});

// Program counter (PC) and index register (I)
let _PC = 0x200, _I = 0;

// Fetch
function fetchOp() {
    const opByte1 = memory[_PC];
    const opByte2 = memory[_PC + 1];
    _PC += 2; // Increment program counter by two bytes
    decodeOp(opByte1, opByte2);
}

// Decode
function decodeOp(op1, op2) {
    // Bitmask to get each nibble (half-byte) value
    // TODO: Figure out a better way to get first hex number out of op1 and op2
    const nibble1 = parseInt(('0' + (op1 & 0xF0).toString(16)).slice(-2).slice(0,1), 16);
    const nibble2 = op1 & 0x0F;
    const nibble3 = parseInt(('0' + (op2 & 0xF0).toString(16)).slice(-2).slice(0,1), 16);
    const nibble4 = op2 & 0x0F;
    const fullOpCode = parseInt(op1.toString(16) + op2.toString(16), 16);

    // Extract common values from opcode
    const opX = nibble2; // The second nibble. Used to look up one of the 16 registers (VX) from V0 through VF.
    const opY = nibble3; // The third nibble. Also used to look up one of the 16 registers (VY) from V0 through VF.
    const opN = nibble4; // The fourth nibble. A 4-bit number.
    const opNN = op2; // The second byte (third and fourth nibbles). An 8-bit immediate number.
    const opNNN = parseInt(nibble2.toString(16) + op2.toString(16), 16); // The second, third and fourth nibbles. A 12-bit immediate memory address.

    if (fullOpCode == 0x00E0) {
        console.log("Clear Screen");
        clearScreen();
    }
    else if (fullOpCode == 0x00EE) {
        console.log("Exit subroutine");
        _PC = stack.pop();
    }

    switch (nibble1) {
        case 0x1:
           console.log("Jump to " + opNNN.toString(16));
           _PC = opNNN;
           break;
        
        case 0x2:
            console.log("Enter subroutine at " + opNNN.toString(16));
            stack.push(_PC);
            _PC = opNNN;
            break;

        case 0x3:
            console.log("Skip if V" + opX + " = " + opNN);
            if (vReg[opX] == opNN) {
                _PC += 2;
            }
            break;

        case 0x4:
            console.log("Skip if V" + opX + " 1= " + opNN);
            if (vReg[opX] != opNN) {
                _PC += 2;
            }
            break;    
        
        case 0x5:
            console.log("Skip if V" + opX + " == V" + opY);
            if (vReg[opX] == vReg[opY]) {
                _PC += 2;
            }
            break;    

        case 0x6:
            console.log("Set register V" + opX.toString(16) + " to " + opNN.toString(16));
            vReg[opX] = opNN;
            break;

        case 0x7:
            console.log("Add " + opNN.toString(16) + " to V" + opX.toString(16));
            vReg[opX] += opNN;
            break;

        case 0x9:
            console.log("Skip if V" + opX + " != V" + opY);
            if (vReg[opX] != vReg[opY]) {
                _PC += 2;
            }
            break; 
        
        case 0xA:
            console.log("Set index register to " + opNNN.toString(16));
            _I = opNNN;
            break;
        
        case 0xB:
            console.log("Jump with offset");
            _PC = opNNN + vReg[0];
            break; 

        case 0xC:
            console.log("Random number");
            vReg[opX] = Math.floor(Math.random() * 0xFF) & opNN;
            break; 

        case 0xD:
            console.log("Draw X:" + opX.toString(16) + " Y:" + opY.toString(16) + " N:" + opN.toString(16));
            let yCoord = vReg[opY] % 32;
            vReg[0xF] = 0;
            let n = opN;
            for (let i = 0; i < n; i++) {
                let xCoord = vReg[opX] % 64;
                const spriteData = ("00000000" + memory[_I + i].toString(2)).slice(-8);
                for (let j = 0; j < 8; j++) {
                    if (spriteData[j] == 1) {
                        let flagBit = 1;
                        let pixelData = canvas.getImageData(xCoord, yCoord, 1, 1).data;
                        if (pixelData[0] == 0) {
                            flagBit = 0;
                            vReg[0xF] = 1;
                        }
                        draw(xCoord, yCoord, flagBit);
                    }
                    xCoord++;
                }
                yCoord++;
            }
            break;
    }
}

// Draw
function draw(x, y, flagBit) {
    if (flagBit == 1) {
        canvas.fillStyle = "rgb(0 0 0)";
    }
    else {
        canvas.fillStyle = "rgb(255 255 255)";
    }
    canvas.fillRect(x, y, 1, 1);
}

// Clear screen
function clearScreen() {
    for (let i = 1; i <= screenWidth; i++) {
        for (let j = 1; j <= screenHeight; j++) {
            draw(i, j, 0);
        }
    }
}

// Start loop
function startLoop() {
    loopInterval = setInterval(() => {
        if (time + 16.667 <= Date.now()) {
            time = Date.now();
            if (_timer > 0) {
                _timer--;
            }
            if (_sound > 0) {
                _sound--;
            }
            time = Date.now();
        }

        fetchOp();
        
    }, 1000 / cpuFreq);
}