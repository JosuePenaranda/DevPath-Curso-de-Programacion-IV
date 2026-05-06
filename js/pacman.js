// Juego de Pacman - Tema 5: JavaScript (Eventos del DOM)

let ancho = 0;
let alto = 0;
let personajeExiste = false;
let posPersonaje = null;
let objetos = [];
let enemigos = [];
let puntaje = 0;
let tableroData = [];
let vidas = 3;
let turno = 0;
let posInicial = null;
const TURNO_ENEMIGO = 2; // enemigos se mueven cada 2 turnos del pacman

class Punto {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Enemigo {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    emoji() { return "👾"; }
    mover() {}
}

class EnemigoRandom extends Enemigo {
    emoji() { return "👻"; }
    mover() {
        const dirs = [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}];
        const posibles = dirs.filter(d => {
            let nx = this.x + d.dx, ny = this.y + d.dy;
            return nx >= 0 && ny >= 0 && nx < ancho && ny < alto && tableroData[ny][nx] !== 1;
        });
        if (posibles.length === 0) return;
        const d = posibles[Math.floor(Math.random() * posibles.length)];
        this.x += d.dx;
        this.y += d.dy;
    }
}

class EnemigoAstar extends Enemigo {
    emoji() { return "😈"; }
    mover() {
        if (!posPersonaje) return;
        const paso = astar(this.x, this.y, posPersonaje.x, posPersonaje.y);
        if (paso) { this.x = paso.x; this.y = paso.y; }
    }
}

function astar(sx, sy, gx, gy) {
    const key = (x, y) => x + "," + y;
    const h = (x, y) => Math.abs(x - gx) + Math.abs(y - gy);
    const abiertos = [{ x: sx, y: sy, g: 0, f: h(sx, sy), padre: null }];
    const cerrados = new Set();
    const mejores = {};
    mejores[key(sx, sy)] = 0;

    while (abiertos.length > 0) {
        abiertos.sort((a, b) => a.f - b.f);
        const actual = abiertos.shift();
        if (actual.x === gx && actual.y === gy) {
            // Reconstruir: primer paso desde origen
            let nodo = actual;
            while (nodo.padre && (nodo.padre.x !== sx || nodo.padre.y !== sy)) nodo = nodo.padre;
            return nodo.padre ? { x: nodo.x, y: nodo.y } : { x: actual.x, y: actual.y };
        }
        cerrados.add(key(actual.x, actual.y));
        for (const d of [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}]) {
            let nx = actual.x + d.dx, ny = actual.y + d.dy;
            if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue;
            if (tableroData[ny][nx] === 1) continue;
            if (cerrados.has(key(nx, ny))) continue;
            const g = actual.g + 1;
            if (mejores[key(nx, ny)] !== undefined && mejores[key(nx, ny)] <= g) continue;
            mejores[key(nx, ny)] = g;
            abiertos.push({ x: nx, y: ny, g, f: g + h(nx, ny), padre: actual });
        }
    }
    return null;
}

function crearTablero() {
    ancho = parseInt(document.getElementById("ancho").value);
    alto = parseInt(document.getElementById("alto").value);
    personajeExiste = false;
    posPersonaje = null;
    posInicial = null;
    objetos = [];
    enemigos = [];
    puntaje = 0;
    vidas = 3;
    turno = 0;
    document.getElementById("puntaje").innerHTML = 0;
    document.getElementById("vidas").innerHTML = "❤️".repeat(vidas);

    tableroData = [];
    for (var i = 0; i < alto; i++) {
        tableroData[i] = [];
        for (var j = 0; j < ancho; j++) {
            tableroData[i][j] = Math.random() < 0.2 ? 1 : 0;
        }
    }

    // Celdas libres disponibles
    let libres = [];
    for (var i = 0; i < alto; i++)
        for (var j = 0; j < ancho; j++)
            if (tableroData[i][j] === 0) libres.push(new Punto(j, i));

    // Numero aleatorio de cerezas (entre 3 y 30% de celdas libres)
    let totalCerezas = Math.max(3, Math.floor(libres.length * (0.1 + Math.random() * 0.2)));
    for (var k = 0; k < totalCerezas && libres.length > 0; k++) {
        let idx = Math.floor(Math.random() * libres.length);
        objetos.push(libres.splice(idx, 1)[0]);
    }

    // Siempre 2 enemigos: uno random y uno A*
    for (var k = 0; k < 2 && libres.length > 0; k++) {
        let idx = Math.floor(Math.random() * libres.length);
        let p = libres.splice(idx, 1)[0];
        enemigos.push(k === 0 ? new EnemigoRandom(p.x, p.y) : new EnemigoAstar(p.x, p.y));
    }

    renderTablero();
}

function celdaContenido(i, j) {
    let contenido, estilo = "";
    if (tableroData[i][j] === 1) {
        contenido = obstaculo();
        estilo = " style='background:#222;pointer-events:none;'";
        return { contenido, estilo };
    }
    const enemigo = enemigos.find(e => e.x == j && e.y == i);
    const tieneFruta = objetos.some(o => o.x == j && o.y == i);
    if (posPersonaje && posPersonaje.x == j && posPersonaje.y == i) {
        contenido = personaje();
    } else if (enemigo) {
        // Mostrar enemigo encima de fruta si coinciden
        contenido = tieneFruta ? enemigo.emoji() + objeto() : enemigo.emoji();
    } else if (tieneFruta) {
        contenido = objeto();
    } else {
        contenido = espacio();
    }
    return { contenido, estilo };
}

function renderTablero() {
    let htmlGenerado = "";
    for (var i = 0; i < alto; i++) {
        htmlGenerado += "<tr>";
        for (var j = 0; j < ancho; j++) {
            const { contenido, estilo } = celdaContenido(i, j);
            htmlGenerado += "<td id='pos" + i + "-" + j + "'" + estilo + " onclick='establecerPersona(" + i + "," + j + ")'>" + contenido + "</td>";
        }
        htmlGenerado += "</tr>";
    }
    document.getElementById("tablero").innerHTML = htmlGenerado;
}

function establecerPersona(i, j) {
    if (!personajeExiste && tableroData[i][j] !== 1) {
        posPersonaje = new Punto(j, i);
        posInicial = new Punto(j, i);
        personajeExiste = true;
        render();
    }
}

function personaje() {
    return "🥠";
}

function objeto() {
    return "🍒";
}

function obstaculo() {
    return "🧱";
}

function espacio() {
    return "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
}

function render() {
    let htmlGenerado = "";
    for (var i = 0; i < alto; i++) {
        htmlGenerado += "<tr>";
        for (var j = 0; j < ancho; j++) {
            const { contenido, estilo } = celdaContenido(i, j);
            htmlGenerado += "<td id='pos" + i + "-" + j + "'" + estilo + ">" + contenido + "</td>";
        }
        htmlGenerado += "</tr>";
    }
    document.getElementById("tablero").innerHTML = htmlGenerado;
}

document.addEventListener("keydown", function (event) {
    if (!personajeExiste) return;
    let nx = posPersonaje.x, ny = posPersonaje.y;
    switch (event.key) {
        case "ArrowUp":    ny = Math.max(0, ny - 1); event.preventDefault(); break;
        case "ArrowDown":  ny = Math.min(alto - 1, ny + 1); event.preventDefault(); break;
        case "ArrowLeft":  nx = Math.max(0, nx - 1); event.preventDefault(); break;
        case "ArrowRight": nx = Math.min(ancho - 1, nx + 1); event.preventDefault(); break;
        default: return;
    }

    if (tableroData[ny][nx] === 1) return;
    posPersonaje.x = nx;
    posPersonaje.y = ny;
    turno++;

    // Comer cereza
    let idx = objetos.findIndex(o => o.x == posPersonaje.x && o.y == posPersonaje.y);
    if (idx !== -1) {
        objetos.splice(idx, 1);
        puntaje++;
        document.getElementById("puntaje").innerHTML = puntaje;
    }

    // Colisión con enemigo antes de moverlos
    if (verificarColisionEnemigo()) return;

    // Mover enemigos cada TURNO_ENEMIGO turnos
    if (turno % TURNO_ENEMIGO === 0) enemigos.forEach(e => e.mover());

    // Colisión con enemigo después de moverse
    if (verificarColisionEnemigo()) return;

    // Ganar si no quedan cerezas
    if (objetos.length === 0) {
        render();
        if (confirm("🎉 ¡Ganaste! Comiste todas las cerezas.\nPuntaje: " + puntaje + "\n\n¿Jugar de nuevo?")) crearTablero();
        else reiniciarEstado();
        return;
    }

    render();
});

function verificarColisionEnemigo() {
    if (enemigos.some(e => e.x == posPersonaje.x && e.y == posPersonaje.y)) {
        vidas--;
        document.getElementById("vidas").innerHTML = "❤️".repeat(vidas);
        if (vidas <= 0) {
            render();
            if (confirm("💀 ¡Game Over! Te quedaste sin vidas.\nPuntaje: " + puntaje + "\n\n¿Jugar de nuevo?")) crearTablero();
            else reiniciarEstado();
            return true;
        }
        // Reaparecer en posición inicial
        posPersonaje.x = posInicial.x;
        posPersonaje.y = posInicial.y;
        render();
        return false; // sigue jugando
    }
    return false;
}

function reiniciarEstado() {
    personajeExiste = false;
    posPersonaje = null;
    objetos = [];
    enemigos = [];
    puntaje = 0;
    tableroData = [];
    alto = 0;
    ancho = 0;
    vidas = 3;
    turno = 0;
    posInicial = null;
    document.getElementById("puntaje").innerHTML = 0;
    document.getElementById("vidas").innerHTML = "❤️❤️❤️";
    document.getElementById("tablero").innerHTML = "";
}

