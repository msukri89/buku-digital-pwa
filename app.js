pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pageFlip;
let suaraKertas = document.getElementById('suara-kertas');
let modeRTL = false; 

// --- LOGIKA CERDAS DOCK (AUTO-HIDE TANPA GANGGUAN) ---
const dock = document.getElementById('dock');
let timerTenggelam;

function sembunyikanDock() {
    dock.classList.add('hide');
}

function bangunkanDock(e) {
    // Mencegah konflik sentuhan
    if (e) e.stopPropagation(); 
    
    dock.classList.remove('hide');
    clearTimeout(timerTenggelam);
    timerTenggelam = setTimeout(sembunyikanDock, 3500); // Sembunyi setelah 3.5 detik
}

// Dock hanya muncul di awal, sisanya hanya aktif jika area dock didekati/disentuh
dock.addEventListener('mouseenter', bangunkanDock);
dock.addEventListener('touchstart', bangunkanDock, {passive: true});

// Jalankan pertama kali saat aplikasi dibuka agar pengguna tahu ada menu
setTimeout(sembunyikanDock, 4000);

// --- LOGIKA AUDIO (PERBAIKAN COMPATIBILITY HP) ---
function mainkanSuara() {
    if (suaraKertas) {
        suaraKertas.muted = false;
        suaraKertas.currentTime = 0;
        // Gunakan interaksi langsung untuk menembus proteksi browser
        let playPromise = suaraKertas.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Browser memblokir audio otomatis: ", error);
            });
        }
    }
}

// Aktifkan pemicu suara awal saat user berinteraksi dengan tombol upload
document.getElementById('pdf-upload').addEventListener('click', function() {
    if (suaraKertas) {
        suaraKertas.play().then(() => {
            suaraKertas.pause(); // Pancing browser agar mengizinkan audio berjalan
        }).catch(e => console.log("Audio siap diaktifkan"));
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
    bangunkanDock();
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

    pageFlip = new St.PageFlip(bukuDiv, {
        width: Math.round(lebarBuku),   
        height: Math.round(tinggiBuku), 
        size: "stretch",                
        minWidth: 300,
        maxWidth: 1000,
        minHeight: 400,
        maxHeight: 1500,
        showCover: true,
        usePortrait: true, 
        flippingTime: 800
    });

    pageFlip.loadFromHTML(bukuDiv.querySelectorAll('.lembaran'));

    // Pemicu suara saat halaman sukses dibalik
    pageFlip.on('flip', (e) => {
        mainkanSuara();
    });
}

// --- TOMBOL KONTROL ARAH BACA ---
document.getElementById('btn-ltr').addEventListener('click', (e) => {
    modeRTL = false;
    bangunkanDock();
});

document.getElementById('btn-rtl').addEventListener('click', (e) => {
    modeRTL = true;
    bangunkanDock();
});

// --- SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
