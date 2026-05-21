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

// --- LOGIKA AUDIO & VOLUME ---
document.getElementById('btn-vol').addEventListener('click', () => {
    suaraAktif = !suaraAktif;
    document.getElementById('icon-vol-on').style.display = suaraAktif ? 'block' : 'none';
    document.getElementById('icon-vol-off').style.display = suaraAktif ? 'none' : 'block';
});

function mainkanSuara() {
    if (suaraKertas && suaraAktif) {
        suaraKertas.muted = false;
        suaraKertas.currentTime = 0;
        let playPromise = suaraKertas.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.log("Menunggu interaksi pengguna"));
        }
    }
}

document.getElementById('pdf-upload').addEventListener('click', function() {
    if (suaraKertas && suaraAktif) {
        suaraKertas.play().then(() => {
            suaraKertas.pause(); 
        }).catch(e => console.log("Audio siap"));
    }
});

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
    dock.classList.remove('collapsed'); // Buka menu saat file terpilih
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

    daftarHalaman.forEach(hal => bukuDiv.appendChild(hal));

    // KALKULASI DIMENSI DINAMIS AGAR TIDAK TERPOTONG
    let canvasPertama = bukuDiv.querySelector('canvas');
    let rasioAsli = canvasPertama ? (canvasPertama.height / canvasPertama.width) : 1.414;
    
    let lebarLayar = window.innerWidth;
    let tinggiLayar = window.innerHeight;
    let isLandscape = lebarLayar > tinggiLayar;
    let paddingAtasBawah = 60; // Ruang bernapas
    let paddingKiriKanan = 60; 

    // Kalkulasi untuk SATU halaman
    let batasTinggi = tinggiLayar - paddingAtasBawah;
    let batasLebar = (lebarLayar - paddingKiriKanan) / (isLandscape ? 2 : 1);

    let targetTinggi = batasTinggi;
    let targetLebar = targetTinggi / rasioAsli;

    // Jika melebar keluar batas, sesuaikan dari lebarnya
    if (targetLebar > batasLebar) {
        targetLebar = batasLebar;
        targetTinggi = targetLebar * rasioAsli;
    }

    // INISIALISASI MESIN FLIP
    pageFlip = new St.PageFlip(bukuDiv, {
        width: Math.round(targetLebar),   
        height: Math.round(targetTinggi), 
        size: "stretch",                
        minWidth: 300,
        maxWidth: 1500,
        minHeight: 400,
        maxHeight: 2000,
        showCover: true,
        usePortrait: true,
        maxShadowOpacity: 0.15, // KOREKSI: Bayangan dibuat sangat tipis agar tidak terlihat silver/metalik
        drawShadow: true,
        flippingTime: 800
    });

    pageFlip.loadFromHTML(bukuDiv.querySelectorAll('.lembaran'));

    pageFlip.on('flip', (e) => {
        mainkanSuara();
    });
}

// --- KONTROL ARAH BACA ---
document.getElementById('btn-ltr').addEventListener('click', () => modeRTL = false);
document.getElementById('btn-rtl').addEventListener('click', () => modeRTL = true);

// Render ulang ukuran buku jika HP diputar
window.addEventListener('resize', () => {
    // Pengguna harus muat ulang PDF untuk orientasi baru yang sempurna
    // atau biarkan PageFlip menangani peregangan internalnya
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
