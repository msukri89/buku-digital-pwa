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
    dock.classList.remove('collapsed'); 
});

// --- MESIN PEMBUAT BUKU (KALKULASI FLEKSIBEL ANTI-TERPOTONG) ---
async function renderBuku(pdf) {
    let bukuDiv = document.getElementById('buku');
    bukuDiv.innerHTML = ''; 
    
    if(pageFlip) {
        pageFlip.destroy(); 
        pageFlip = null;
    }

    let jumlahHalaman = pdf.numPages;
    let daftarHalaman = [];

    // Gunakan resolusi tinggi untuk render awal
    for (let i = 1; i <= jumlahHalaman; i++) {
        let page = await pdf.getPage(i);
        let viewport = page.getViewport({ scale: 1.5 }); 
        
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

    if (modeRTL) {
        daftarHalaman.reverse();
    }

    daftarHalaman.forEach(hal => bukuDiv.appendChild(hal));

    // MENGHITUNG DIMENSI RUANG BACA SECARA AKURAT
    let canvasPertama = bukuDiv.querySelector('canvas');
    let rasioHalaman = canvasPertama ? (canvasPertama.width / canvasPertama.height) : 0.707; // W / H
    
    let areaBaca = document.getElementById('area-baca');
    let lebarTersedia = areaBaca.clientWidth;
    let tinggiTersedia = areaBaca.clientHeight;
    let isLandscape = lebarTersedia > tinggiTersedia;

    // Memberikan margin aman agar tidak menempel ke pinggir layar
    let lebarAman = lebarTersedia - (isLandscape ? 100 : 40);
    let tinggiAman = tinggiTersedia - 60;

    // Kalkulasi ukuran per 1 halaman
    let targetTinggi = tinggiAman;
    let targetLebar = targetTinggi * rasioHalaman;

    // Validasi jika terlalu lebar
    if (isLandscape) {
        // Landscape menampilkan 2 halaman bersebelahan
        if ((targetLebar * 2) > lebarAman) {
            targetLebar = lebarAman / 2;
            targetTinggi = targetLebar / rasioHalaman;
        }
    } else {
        // Portrait menampilkan 1 halaman
        if (targetLebar > lebarAman) {
            targetLebar = lebarAman;
            targetTinggi = targetLebar / rasioHalaman;
        }
    }

    // INISIALISASI MESIN DENGAN UKURAN PASTI (FIXED) AGAR TIDAK TERPOTONG
    pageFlip = new St.PageFlip(bukuDiv, {
        width: Math.floor(targetLebar),   
        height: Math.floor(targetTinggi), 
        size: "fixed", // Wajib FIXED agar ukuran terkunci di batas aman layar
        minWidth: 300,
        maxWidth: 1500,
        minHeight: 400,
        maxHeight: 2000,
        showCover: true,
        usePortrait: true,
        maxShadowOpacity: 0.05, // Bayangan sangat tipis, tidak silver
        drawShadow: true,
        flippingTime: 850 // Animasi buka buku yang lebih elegan
    });

    pageFlip.loadFromHTML(bukuDiv.querySelectorAll('.lembaran'));

    pageFlip.on('flip', (e) => {
        mainkanSuara();
    });
}

// --- KONTROL ARAH BACA ---
document.getElementById('btn-ltr').addEventListener('click', () => modeRTL = false);
document.getElementById('btn-rtl').addEventListener('click', () => modeRTL = true);

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
