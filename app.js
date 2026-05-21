pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pageFlip;
let suaraKertas = document.getElementById('suara-kertas');
let modeRTL = false; 

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

    for (let i = 1; i <= jumlahHalaman; i++) {
        let page = await pdf.getPage(i);
        let viewport = page.getViewport({ scale: 1.5 }); 
        
        let divHalaman = document.createElement('div');
        divHalaman.className = 'lembaran';
        
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Memastikan ukuran PDF pas dengan halaman buku
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
    let lebar = canvasPertama ? canvasPertama.width / 1.5 : 400;
    let tinggi = canvasPertama ? canvasPertama.height / 1.5 : 600;

    // KOREKSI DI SINI: Menggunakan St.PageFlip
    pageFlip = new St.PageFlip(bukuDiv, {
        width: lebar,
        height: tinggi,
        size: "fit", // Diubah ke fit agar tidak melar di HP
        minWidth: 300,
        maxWidth: 1000,
        minHeight: 400,
        maxHeight: 1500,
        showCover: true,
        usePortrait: true, // Memaksa 1 halaman saat di HP
        flippingTime: 700
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.lembaran'));

    pageFlip.on('flip', (e) => {
        mainkanSuara();
    });
}

document.getElementById('btn-ltr').addEventListener('click', () => {
    modeRTL = false;
    alert("Mode Standar aktif. Silakan upload ulang PDF Anda.");
});

document.getElementById('btn-rtl').addEventListener('click', () => {
    modeRTL = true;
    alert("Mode Arab aktif. Silakan upload ulang PDF Anda.");
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
        console.log('PWA Siap!');
    });
}

// Mengaktifkan Service Worker agar menjadi PWA (Bisa diinstal & Offline)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
        console.log('PWA Siap digunakan!');
    });
}
