pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pageFlip;
let suaraKertas = document.getElementById('suara-kertas');
let modeRTL = false; 
let suaraAktif = true;
let audioUnlocked = false;

// --- TRIK MEMBUKA KUNCI AUDIO DI HP ---
function bukaKunciAudio() {
    if (!audioUnlocked && suaraKertas && suaraAktif) {
        suaraKertas.muted = false;
        suaraKertas.play().then(() => {
            suaraKertas.pause();
            audioUnlocked = true;
        }).catch(e => console.log("Menunggu"));
    }
}
document.body.addEventListener('touchstart', bukaKunciAudio, { once: true });
document.body.addEventListener('click', bukaKunciAudio, { once: true });

// --- LOGIKA MENU TOGGLE ---
const dock = document.getElementById('dock');
document.getElementById('menu-toggle').addEventListener('click', () => {
    dock.classList.toggle('collapsed');
});

document.getElementById('btn-vol').addEventListener('click', () => {
    suaraAktif = !suaraAktif;
    document.getElementById('icon-vol-on').style.display = suaraAktif ? 'block' : 'none';
    document.getElementById('icon-vol-off').style.display = suaraAktif ? 'none' : 'block';
});

function mainkanSuara() {
    if (suaraKertas && suaraAktif && audioUnlocked) {
        suaraKertas.currentTime = 0;
        suaraKertas.play().catch(e => console.log("Gagal memutar audio"));
    }
}

// --- LOGIKA UPLOAD ---
document.getElementById('pdf-upload').addEventListener('change', function(e) {
    let file = e.target.files[0];
    if(file.type !== 'application/pdf') { alert('Mohon pilih file berformat PDF!'); return; }
    let fileReader = new FileReader();
    fileReader.onload = function() {
        let typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => renderBuku(pdf));
    };
    fileReader.readAsArrayBuffer(file);
    dock.classList.remove('collapsed'); 
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
