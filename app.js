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
    }, 3000); // Otomatis tenggelam setelah 3 detik tidak disentuh
}

// Mendeteksi sentuhan atau gerakan untuk memunculkan dock
document.addEventListener('click', bangunkanDock);
document.addEventListener('touchstart', bangunkanDock);
document.addEventListener('mousemove', bangunkanDock);
bangunkanDock(); // Jalankan pertama kali saat aplikasi dibuka

// --- LOGIKA BUKU ---
function mainkanSuara() {
    suaraKertas.currentTime = 0;
    suaraKertas.play().catch(e => console.log("Menunggu interaksi pengguna"));
}

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

async function renderBuku(pdf) {
    let bukuDiv = document.getElementById('buku');
    bukuDiv.innerHTML = ''; 
    
    if(pageFlip) {
        pageFlip.destroy(); 
        pageFlip = null;
    }

    let jumlahHalaman = pdf.numPages;
    let daftarHalaman = [];

    // Looop ekstraksi PDF dibiarkan persis sama karena sudah berjalan optimal
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

    daftarHalaman.forEach(hal => bukuDiv.appendChild(hal));

    // Menyesuaikan ukuran buku berdasarkan layar
    let canvasPertama = bukuDiv.querySelector('canvas');
    let rasioAsli = canvasPertama ? (canvasPertama.height / canvasPertama.width) : 1.414;
    
    let lebarLayar = window.innerWidth;
    let tinggiLayar = window.innerHeight;
    
    // Penyesuaian agar muat di layar dengan baik
    let lebarBuku = lebarLayar * 0.9;
    let tinggiBuku = lebarBuku * rasioAsli;
    
    if(tinggiBuku > tinggiLayar * 0.9) {
        tinggiBuku = tinggiLayar * 0.9;
        lebarBuku = tinggiBuku / rasioAsli;
    }

    pageFlip = new St.PageFlip(bukuDiv, {
        width: lebarBuku,
        height: tinggiBuku,
        size: "fit", 
        minWidth: 300,
        maxWidth: 1000,
        minHeight: 400,
        maxHeight: 1500,
        showCover: true,
        usePortrait: true, // Otomatis 1 halaman di Portrait, 2 halaman di Landscape
        flippingTime: 800
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.lembaran'));

    pageFlip.on('flip', (e) => {
        mainkanSuara();
    });
}

document.getElementById('btn-ltr').addEventListener('click', () => {
    modeRTL = false;
});

document.getElementById('btn-rtl').addEventListener('click', () => {
    modeRTL = true;
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
