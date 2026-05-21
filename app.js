pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pageFlip;
let suaraKertas = document.getElementById('suara-kertas');
let modeRTL = false; 

// --- LOGIKA AUTO-HIDE DOCK ---
const dock = document.getElementById('dock');
let timerTenggelam;

function bangunkanDock() {
    dock.classList.remove('hide');
    clearTimeout(timerTenggelam);
    timerTenggelam = setTimeout(() => {
        dock.classList.add('hide');
    }, 3000); 
}

document.addEventListener('click', bangunkanDock);
document.addEventListener('touchstart', bangunkanDock);
document.addEventListener('mousemove', bangunkanDock);
bangunkanDock(); 

// --- LOGIKA AUDIO ---
function mainkanSuara() {
    suaraKertas.currentTime = 0;
    suaraKertas.play().catch(e => console.log("Menunggu interaksi pengguna"));
}

// --- LOGIKA UPLOAD ---
document.getElementById('pdf-upload').addEventListener('change', function(e) {
    let file = e.target.files[0];
    if(file.type !== 'application/pdf') {
        alert('Mohon pilih file berformat PDF!');
        return;
    }

    let fileReader = new FileReader();
    fileReader.onload = function() {
        let typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            renderBuku(pdf);
        });
    };
    fileReader.readAsArrayBuffer(file);
});

// --- MESIN PEMBUAT BUKU ---
async function renderBuku(pdf) {
    let bukuDiv = document.getElementById('buku');
    bukuDiv.innerHTML = ''; 
    
    if(pageFlip) {
        pageFlip.destroy(); 
        pageFlip = null;
    }

    let jumlahHalaman = pdf.numPages;
    let daftarHalaman = [];

    for (let i = 1; i <= jumlahHalaman; i++) {
        let page = await pdf.getPage(i);
        let viewport = page.getViewport({ scale: 1.5 }); 
        
        let divHalaman = document.createElement('div');
        divHalaman.className = 'lembaran';
        
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        
        divHalaman.appendChild(canvas);
        daftarHalaman.push(divHalaman);
    }

    if (modeRTL) {
        daftarHalaman.reverse();
    }

    // Masukkan ke DOM
    daftarHalaman.forEach(hal => bukuDiv.appendChild(hal));

    // Ambil rasio untuk ukuran buku
    let canvasPertama = bukuDiv.querySelector('canvas');
    let rasioAsli = canvasPertama ? (canvasPertama.height / canvasPertama.width) : 1.414;
    
    let lebarLayar = window.innerWidth;
    let tinggiLayar = window.innerHeight;
    
    let lebarBuku = lebarLayar * 0.9;
    let tinggiBuku = lebarBuku * rasioAsli;
    
    if(tinggiBuku > tinggiLayar * 0.9) {
        tinggiBuku = tinggiLayar * 0.9;
        lebarBuku = tinggiBuku / rasioAsli;
    }

    // INISIALISASI MESIN FLIP (BUG TELAH DIPERBAIKI DI SINI)
    pageFlip = new St.PageFlip(bukuDiv, {
        width: Math.round(lebarBuku),   // Wajib angka bulat
        height: Math.round(tinggiBuku), // Wajib angka bulat
        size: "stretch",                // Wajib menggunakan parameter 'stretch'
        minWidth: 300,
        maxWidth: 1000,
        minHeight: 400,
        maxHeight: 1500,
        showCover: true,
        usePortrait: true, // Otomatis 1 halaman di layar sempit, 2 halaman di layar lebar
        flippingTime: 800
    });

    // Pemuatan HTML difokuskan hanya pada elemen dalam bukuDiv
    pageFlip.loadFromHTML(bukuDiv.querySelectorAll('.lembaran'));

    pageFlip.on('flip', (e) => {
        mainkanSuara();
    });
}

// --- TOMBOL KONTROL ARAH BACA ---
document.getElementById('btn-ltr').addEventListener('click', () => {
    modeRTL = false;
});

document.getElementById('btn-rtl').addEventListener('click', () => {
    modeRTL = true;
});

// --- SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
