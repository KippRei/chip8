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
    // const fileName = "IBM-Logo.ch8";
    // const fileName = "danm8ku.ch8";
    // const fileName = "test_opcode.ch8";
    // const fileName = "BC_test.ch8";
    const fileName = "glitchGhost.ch8";

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
let memory = new Uint8Array(4096).fill(0);

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
const font = new Uint8Array([
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
]);

// Load font into memory starting at 0x050 (through 0x09F)
let i = 0x050;
font.forEach( e => {
    memory[i] = e;
    i++;
});

// Stack
let stack = new Array();

// General registers
let vReg = new Uint8Array(16);

// Timer and sound registers (60hz)
let _delayTimer = 0,_soundTimer = 0;
let time = Date.now();

// Input
let keyDownArr = new Uint8Array(15).fill(0);

onkeydown = (e => {
    keyDownArr.forEach( e => {
        console.log(e);
    });
    switch(e.code) {
        case "Digit1":
            keyDownArr[0x1] = 1;
            break;
        case "Digit2":
            keyDownArr[0x2] = 1;
            break;
        case "Digit3":
            keyDownArr[0x3] = 1;
            break;
        case "Digit4":
            keyDownArr[0xC] = 1;
            break;
        case "KeyQ":
            keyDownArr[0x4] = 1;
            break;
        case "KeyW":
            keyDownArr[0x5] = 1;
            break;
        case "KeyE":
            keyDownArr[0x6] = 1;
            break;
        case "KeyR":
            keyDownArr[0xD] = 1;
            break;
        case "KeyA":
            keyDownArr[0x7] = 1;
            break;
        case "KeyS":
            keyDownArr[0x8] = 1;
            break;
        case "KeyD":
            keyDownArr[0x9] = 1;
            break;
        case "KeyF":
            keyDownArr[0xE] = 1;
            break;
        case "KeyZ":
            keyDownArr[0xA] = 1;
            break;
        case "KeyX":
            keyDownArr[0x0] = 1;
            break;
        case "KeyC":
            keyDownArr[0xB] = 1;
            break;
        case "KeyV":
            keyDownArr[0xF] = 1;
            break;
        case "Space":
            fetchOp();
            break;
    }
});

onkeyup = (e => {
    switch(e.code) {
        case "Digit1":
            keyDownArr[0x1] = 0;
            break;
        case "Digit2":
            keyDownArr[0x2] = 0;
            break;
        case "Digit3":
            keyDownArr[0x3] = 0;
            break;
        case "Digit4":
            keyDownArr[0xC] = 0;
            break;
        case "KeyQ":
            keyDownArr[0x4] = 0;
            break;
        case "KeyW":
            keyDownArr[0x5] = 0;
            break;
        case "KeyE":
            keyDownArr[0x6] = 0;
            break;
        case "KeyR":
            keyDownArr[0xD] = 0;
            break;
        case "KeyA":
            keyDownArr[0x7] = 0;
            break;
        case "KeyS":
            keyDownArr[0x8] = 0;
            break;
        case "KeyD":
            keyDownArr[0x9] = 0;
            break;
        case "KeyF":
            keyDownArr[0xE] = 0;
            break;
        case "KeyZ":
            keyDownArr[0xA] = 0;
            break;
        case "KeyX":
            keyDownArr[0x0] = 0;
            break;
        case "KeyC":
            keyDownArr[0xB] = 0;
            break;
        case "KeyV":
            keyDownArr[0xF] = 0;
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
    console.log(nibble1.toString(16) + nibble2.toString(16) + nibble3.toString(16) + nibble4.toString(16));

    // Extract common values from opcode
    const opX = nibble2; // The second nibble. Used to look up one of the 16 registers (VX) from V0 through VF.
    const opY = nibble3; // The third nibble. Also used to look up one of the 16 registers (VY) from V0 through VF.
    const opN = nibble4; // The fourth nibble. A 4-bit number.
    const opNN = op2; // The second byte (third and fourth nibbles). An 8-bit immediate number.
    const opNNN = parseInt(nibble2.toString(16) + nibble3.toString(16) + nibble4.toString(16), 16); // The second, third and fourth nibbles. A 12-bit immediate memory address.

    if (fullOpCode == 0x00E0) {
        print("Clear Screen");
        clearScreen();
    }
    if (fullOpCode == 0x00EE) {
        print("Exit subroutine");
        _PC = stack.pop();
    }

    switch (nibble1) {
        case 0x1:
           print("Jump to " + opNNN.toString(16));
           _PC = opNNN;
           break;
        
        case 0x2:
            print("Enter subroutine at " + opNNN.toString(16));
            stack.push(_PC);
            _PC = opNNN;
            break;

        case 0x3:
            print("Skip if V" + opX + " = " + opNN);
            if (vReg[opX] == opNN) {
                _PC += 2;
            }
            break;

        case 0x4:
            print("Skip if V" + opX + " != " + opNN);
            if (vReg[opX] != opNN) {
                _PC += 2;
            }
            break;    
        
        case 0x5:
            print("Skip if V" + opX + " == V" + opY);
            if (vReg[opX] == vReg[opY]) {
                _PC += 2;
            }
            break;    

        case 0x6:
            print("Set register V" + opX.toString(16) + " to " + opNN.toString(16));
            vReg[opX] = opNN;
            break;

        case 0x7:
            print("Add " + opNN.toString(16) + " to V" + opX.toString(16));
            vReg[opX] += opNN;
            break;
        
        case 0x8:
            switch(nibble4) {
                case 0x0:
                    // Set: VX is set to value of VY
                    vReg[opX] = vReg[opY];
                    break;

                case 0x1:
                    // OR: VX is set to the bitwise/binary logical disjunction (OR) of VX and VY. VY is not affected.
                    vReg[opX] |= vReg[opY];
                    break;

                case 0x2:
                    // AND: VX is set to the bitwise/binary logical conjunction (AND) of VX and VY. VY is not affected.
                    vReg[opX] &= vReg[opY];
                    break;

                case 0x3: 
                    // XOR: VX is set to the bitwise/binary exclusive OR (XOR) of VX and VY. VY is not affected.
                    vReg[opX] ^= vReg[opY];
                    break;

                case 0x4:
                    // ADD: VX is set to the value of VX plus the value of VY. VY is not affected. 
                    // Unlike 7XNN, this addition will affect the carry flag. If the result is larger than 255
                    // (and thus overflows the 8-bit register VX), the flag register VF is set to 1. If it doesn’t overflow, VF is set to 0.
                    const total = vReg[opX] + vReg[opY];
                    if (total > 255) {
                        vReg[opX] = total;
                        vReg[0xF] = 1;
                    }
                    else {
                        vReg[opX] = total;
                        vReg[0xF] = 0;
                    }
                    break;

                case 0x5:
                    // SUBTRACT: sets VX to the result of VX - VY.
                    if (vReg[opX] >= vReg[opY]) {
                        vReg[0xF] = 1;
                    }
                    else {
                        vReg[0xF] = 0;
                    }
                    vReg[opX] -= vReg[opY];
                    break;

                case 0x7:
                    // SUBTRACT: sets VX to the result of VY - VX.
                    if (vReg[opY] >= vReg[opX]) {
                        vReg[0xF] = 1;
                    }
                    else {
                        vReg[0xF] = 0;
                    }
                    vReg[opX] = vReg[opY] - vReg[opX];
                    break;

                // Ambiguous Instructions: 0x8XY6 & 0x8XYE (Shift) //
                /*In the CHIP-8 interpreter for the original COSMAC VIP, this instruction did the following:
                It put the value of VY into VX, and then shifted the value in VX 1 bit to the right (8XY6) or left (8XYE).
                VY was not affected, but the flag register VF would be set to the bit that was shifted out.
                However, starting with CHIP-48 and SUPER-CHIP in the early 1990s, these instructions were changed so that they shifted VX in place, and ignored the Y completely.
                This is one of the main differences between implementations that cause problems for programs.
                Since different games expect different behavior, you could consider making the behavior configurable by the user.*/
                case 0x6:
                    // SHIFT: Right, set VF to bit shifted out
                    //vReg[opX] = vReg[opY]; // TODO: Make this optional
                    if (vReg[opX] & 0x01 == 1) {
                        vReg[0xF] = 1;
                    }
                    else {
                        vReg[0xF] = 0;
                    }
                    vReg[opX] >>= 1;
                    break;

                case 0xE:
                    // SHIFT: Left, set VF to bit shifted out
                    // If statement uses bitmask 1000 0000 to check if most significant bit is one (for overflow simulation)
                    // vReg[opX] = vReg[opY]; // TODO: Make this optional
                    // TODO: Find better way to determine most significant bit
                    if (vReg[opX] < 128) {
                        vReg[0xF] = 0;
                    }
                    else {
                        vReg[0xF] = 1;
                    }
                    vReg[opX] &= 0x7F; // JS converts numbers to 32-bit before bit shifting so we use bitmask to remove most significant bit (simulate overflow) (NOTE: changed registers to byte type so this is not necessary anymore)
                    vReg[opX] <<= 1;
                    break;
            }
            break;

        case 0x9:
            print("Skip if V" + opX + " != V" + opY);
            if (vReg[opX] != vReg[opY]) {
                _PC += 2;
            }
            break; 
        
        case 0xA:
            print("Set index register to " + opNNN.toString(16));
            _I = opNNN;
            break;
        
        case 0xB:
            print("Jump with offset");
            _PC = opNNN + vReg[0];
            break; 

        case 0xC:
            print("Random number");
            vReg[opX] = Math.floor(Math.random() * 0xFF) & opNN;
            break; 

        case 0xD:
            print("Draw X:" + opX.toString(16) + " Y:" + opY.toString(16) + " N:" + opN.toString(16));
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
                        if (pixelData[0] == 1) {
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
        
        case 0xE:
            switch(op2) {
                case 0x9E:
                    // Skip (_PC + 2) if key is down
                    if (keyDownArr[opX] == 1) {
                        _PC += 2;
                    }
                    break;

                case 0xA1:
                    // Skip (_PC + 2) if key is not down
                    if (keyDownArr[opX] == 0) {
                        _PC += 2;
                    }
                    break;
            }
            break;

        case 0xF:
            switch(op2) {
                case 0x07:
                    // Sets VX to the current value of the delay timer
                    vReg[opX] = _delayTimer;
                    break;
        
                case 0x15:
                    // Sets the delay timer to the value in VX
                    _delayTimer = vReg[opX];
                    break;

                case 0x18:
                    // Sets the sound timer to the value in VX
                    _soundTimer = vReg[opX];
                    break;

                case 0x1E:
                    // The index register I will get the value in VX added to it.
                    _I += vReg[opX];
                    if (_I > 0x0FFF) {
                        vReg[0xF] = 1;
                    }
                    break;

                case 0x0A:
                    // GET KEY: This instruction “blocks”; it stops executing instructions and waits for key input (or loops forever, unless a key is pressed).
                    let keyPressed = false;
                    for (let i = 0; i < keyDownArr.length; i++) {
                        if (GetKey.keyDownArrState[i] != keyDownArr[i] && keyDownArr[i] == 1) {
                            vReg[opX] = keyDownArr[i];
                            break;
                        }
                    }
                    if (!keyPressed) {
                        _PC -= 2;
                    }
                    break;

                case 0x29:
                    // FONT CHARACTER: The index register I is set to the address of the hexadecimal character in VX. 
                    // You probably stored that font somewhere in the first 512 bytes of memory, so now you just need to point I to the right character.
                    const fontChar = vReg[opX] & 0x0F;
                    switch(fontChar) {
                        case 0x0:
                            _I = 0x050;
                            break;
                            
                        case 0x1:
                            _I = 0x055;
                            break;

                        case 0x2:
                            _I = 0x05A;
                            break;

                        case 0x3:
                            _I = 0x05F;
                            break;

                        case 0x4:
                            _I = 0x064;
                            break;
                            
                        case 0x5:
                            _I = 0x069;
                            break;

                        case 0x6:
                            _I = 0x06E;
                            break;

                        case 0x7:
                            _I = 0x073;
                            break;
                        
                        case 0x8:
                            _I = 0x078;
                            break;
                            
                        case 0x9:
                            _I = 0x07D;
                            break;

                        case 0xA:
                            _I = 0x082;
                            break;

                        case 0xB:
                            _I = 0x087;
                            break;

                        case 0xC:
                            _I = 0x08C;
                            break;
                            
                        case 0xD:
                            _I = 0x091;
                            break;

                        case 0xE:
                            _I = 0x096;
                            break;

                        case 0xF:
                            _I = 0x09B;
                            break;
                    }
                    break;

                case 0x33:
                    // Binary-coded decimal conversion
                    // This instruction is a little involved. It takes the number in VX (which is one byte, so it can be any number from 0 to 255) 
                    // and converts it to three decimal digits, storing these digits in memory at the address in the index register I.
                    // For example, if VX contains 156 (or 9C in hexadecimal), it would put the number 1 at the address in I, 5 in address I + 1, and 6 in address I + 2.
                    const num = vReg[opX];
                    const mostSigBit = Math.floor(num / 100);
                    const leastSigBit = num % 10;
                    const middleBit = (num - (mostSigBit * 100) - leastSigBit) / 10;

                    memory[_I] = mostSigBit; // Most significant bit
                    memory[_I + 1] = middleBit; // Middle bit
                    memory[_I + 2] = leastSigBit; // Least significant bit
                    break;

                // Ambiguous instruction: These two instructions store registers to memory, or load them from memory, respectively.
                case 0x55:
                    for (let i = 0; i <= opX; i++) {
                        memory[_I + i] = vReg[i];
                    }
                    break;

                case 0x65:
                    for (let i = 0; i <= opX; i++) {
                        vReg[i] = memory[_I + i];
                    }
                    break;
                }
            break;
    }
}

// Static variable to hold current state of keyDownArr
class GetKey {
    static keyDownArrState = keyDownArr;
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
            if (_delayTimer > 0) {
                _delayTimer--;
            }
            if (_soundTimer > 0) {
                _soundTimer--;
            }
            time = Date.now();
        }

        fetchOp();
        
    }, 1000 / cpuFreq);
}





/// Helpers
// Console logging (comment console.log(msg) to turn off all logging)
function print(msg) {
    // console.log(msg);
}