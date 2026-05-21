pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pageFlip;
let suaraKertas = document.getElementById('suara-kertas');
let modeRTL = false; 
let suaraAktif = true;

// --- LOGIKA MENU TOGGLE ---
const dock = document.getElementById('dock');
const menuToggle = document.getElementById('menu-toggle');

menuToggle.addEventListener('click', () => {
    dock.classList.toggle('collapsed');
});

// --- LOGIKA AUDIO ---
// Trik agar browser mengizinkan audio setelah user menekan menu
function unlockAudio() {
    if (suaraKertas) {
        suaraKertas.play().then(() => {
            suaraKertas.pause();
            suaraKertas.currentTime = 0;
        }).catch(e => console.log("Menunggu interaksi"));
    }
}
menuToggle.addEventListener('click', unlockAudio, { once: true });

function mainkanSuara() {
    if (suaraKertas && suaraAktif) {
        suaraKertas.currentTime = 0;
        suaraKertas.play().catch(e => console.log("Gagal memutar audio"));
    }
}

// --- MESIN PEMBUAT BUKU (DENGAN KALKULASI RASIO AMAN) ---
async function renderBuku(pdf) {
    let bukuDiv = document.getElementById('buku');
    bukuDiv.innerHTML = ''; 
    if(pageFlip) { pageFlip.destroy(); pageFlip = null; }

    let jumlahHalaman = pdf.numPages;
    let daftarHalaman = [];

    for (let i = 1; i <= jumlahHalaman; i++) {
        let page = await pdf.getPage(i);
        let viewport = page.getViewport({ scale: 2.0 }); 
        let divHalaman = document.createElement('div');
        divHalaman.className = 'lembaran';
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        divHalaman.appendChild(canvas);
        daftarHalaman.push(divHalaman);
    }
    if (modeRTL) daftarHalaman.reverse();
    daftarHalaman.forEach(hal => bukuDiv.appendChild(hal));

    // KALKULASI ANTI-POTONG
    let areaBaca = document.getElementById('area-baca');
    let h = areaBaca.clientHeight * 0.9; // Ambil 90% tinggi layar
    let w = areaBaca.clientWidth * 0.9;
    
    // PageFlip membutuhkan rasio yang konsisten
    pageFlip = new St.PageFlip(bukuDiv, {
        width: Math.floor(w > 800 ? 400 : w/2), // Jika landscape lebar dibagi 2
        height: Math.floor(h), 
        size: "stretch", // Memaksa konten menyesuaikan kotak
        minWidth: 300, maxWidth: 2000,
        minHeight: 400, maxHeight: 2500,
        showCover: true, usePortrait: true,
        maxShadowOpacity: 0.05,
        flippingTime: 800
    });

    pageFlip.loadFromHTML(bukuDiv.querySelectorAll('.lembaran'));
    pageFlip.on('flip', (e) => mainkanSuara());
}

// Upload & Event Listeners
document.getElementById('pdf-upload').addEventListener('change', function(e) {
    let file = e.target.files[0];
    let fileReader = new FileReader();
    fileReader.onload = function() {
        let typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => renderBuku(pdf));
    };
    fileReader.readAsArrayBuffer(file);
});

// --- MESIN PEMBUAT BUKU (KALKULASI AMAN ANTI POTONG) ---
async function renderBuku(pdf) {
    let bukuDiv = document.getElementById('buku');
    bukuDiv.innerHTML = ''; 
    if(pageFlip) { pageFlip.destroy(); pageFlip = null; }

    let jumlahHalaman = pdf.numPages;
    let daftarHalaman = [];

    for (let i = 1; i <= jumlahHalaman; i++) {
        let page = await pdf.getPage(i);
        let viewport = page.getViewport({ scale: 2.0 }); // Resolusi dipertajam
        
        let divHalaman = document.createElement('div');
        divHalaman.className = 'lembaran';
        
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        divHalaman.appendChild(canvas);
        daftarHalaman.push(divHalaman);
    }

    if (modeRTL) daftarHalaman.reverse();
    daftarHalaman.forEach(hal => bukuDiv.appendChild(hal));

    let canvasPertama = bukuDiv.querySelector('canvas');
    let rasioHalaman = canvasPertama ? (canvasPertama.width / canvasPertama.height) : 0.707;
    
    let areaBaca = document.getElementById('area-baca');
    let lebarTersedia = areaBaca.clientWidth;
    let tinggiTersedia = areaBaca.clientHeight;
    let isLandscape = lebarTersedia > tinggiTersedia;

    // Memberikan ruang bernapas yang lebih luas agar tidak mentok
    let paddingY = isLandscape ? 40 : 80; 
    let paddingX = isLandscape ? 80 : 40; 

    let targetTinggi = tinggiTersedia - paddingY;
    let targetLebar = targetTinggi * rasioHalaman;

    // Validasi ekstra ketat agar tidak ada milimeter pun yang terpotong
    if (isLandscape) {
        if ((targetLebar * 2) > (lebarTersedia - paddingX)) {
            targetLebar = (lebarTersedia - paddingX) / 2;
            targetTinggi = targetLebar / rasioHalaman;
        }
    } else {
        if (targetLebar > (lebarTersedia - paddingX)) {
            targetLebar = lebarTersedia - paddingX;
            targetTinggi = targetLebar / rasioHalaman;
        }
    }

    pageFlip = new St.PageFlip(bukuDiv, {
        width: Math.floor(targetLebar),   
        height: Math.floor(targetTinggi), 
        size: "fixed", 
        minWidth: 200, maxWidth: 2000,
        minHeight: 300, maxHeight: 2500,
        showCover: true, usePortrait: true,
        maxShadowOpacity: 0.1, // Bayangan super tipis
        drawShadow: true, flippingTime: 850
    });

    pageFlip.loadFromHTML(bukuDiv.querySelectorAll('.lembaran'));
    pageFlip.on('flip', (e) => mainkanSuara());
}

document.getElementById('btn-ltr').addEventListener('click', () => modeRTL = false);
document.getElementById('btn-rtl').addEventListener('click', () => modeRTL = true);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
