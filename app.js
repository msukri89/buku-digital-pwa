pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pageFlip;
let suaraKertas = document.getElementById('suara-kertas');
let modeRTL = false; 
let suaraAktif = true;
let audioUnlocked = false;

// --- LOGIKA MENU TOGGLE ---
const dock = document.getElementById('dock');
const menuToggle = document.getElementById('menu-toggle');

menuToggle.addEventListener('click', () => {
    dock.classList.toggle('collapsed');
});

// --- LOGIKA AUDIO ---
function unlockAudio() {
    if (!audioUnlocked && suaraKertas) {
        suaraKertas.play().then(() => {
            suaraKertas.pause();
            suaraKertas.currentTime = 0;
            audioUnlocked = true;
        }).catch(e => console.log("Menunggu interaksi"));
    }
}
menuToggle.addEventListener('click', unlockAudio, { once: true });

function mainkanSuara() {
    if (suaraKertas && suaraAktif && audioUnlocked) {
        suaraKertas.currentTime = 0;
        suaraKertas.play().catch(e => console.log("Gagal memutar audio"));
    }
}

// --- LOGIKA UPLOAD ---
document.getElementById('pdf-upload').addEventListener('change', function(e) {
    let file = e.target.files[0];
    if(!file) return;
    let fileReader = new FileReader();
    fileReader.onload = function() {
        let typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => renderBuku(pdf));
    };
    fileReader.readAsArrayBuffer(file);
    dock.classList.remove('collapsed');
});

// --- MESIN PEMBUAT BUKU (FUNGSI TUNGGAL) ---
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

    // KALKULASI DIMENSI
    let areaBaca = document.getElementById('area-baca');
    let w = areaBaca.clientWidth;
    let h = areaBaca.clientHeight;
    let isLandscape = w > h;
    
    // Sesuaikan rasio
    let rasio = 0.707; 
    let targetH = h * 0.9;
    let targetW = (isLandscape ? w/2 : w) * 0.9;

    pageFlip = new St.PageFlip(bukuDiv, {
        width: Math.floor(targetW),
        height: Math.floor(targetH),
        size: "fixed",
        showCover: true,
        usePortrait: true,
        flippingTime: 800
    });

    pageFlip.loadFromHTML(bukuDiv.querySelectorAll('.lembaran'));
    pageFlip.on('flip', mainkanSuara);
}

document.getElementById('btn-ltr').addEventListener('click', () => modeRTL = false);
document.getElementById('btn-rtl').addEventListener('click', () => modeRTL = true);
document.getElementById('btn-vol').addEventListener('click', () => {
    suaraAktif = !suaraAktif;
    document.getElementById('icon-vol-on').style.display = suaraAktif ? 'block' : 'none';
    document.getElementById('icon-vol-off').style.display = suaraAktif ? 'none' : 'block';
});
