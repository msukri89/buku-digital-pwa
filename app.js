// Konfigurasi PDF.js dari Mozilla
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pageFlip;
let suaraKertas = document.getElementById('suara-kertas');
let modeRTL = false; // Default: Kiri ke Kanan

// Memutar suara saat halaman dibalik
function mainkanSuara() {
    suaraKertas.currentTime = 0;
    suaraKertas.play().catch(e => console.log("Menunggu interaksi pengguna untuk audio"));
}

// Menangkap file PDF yang diupload pengguna
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

// Mengubah PDF menjadi lembaran-lembaran buku
async function renderBuku(pdf) {
    let bukuDiv = document.getElementById('buku');
    bukuDiv.innerHTML = ''; // Hapus isi buku sebelumnya jika ada
    
    if(pageFlip) {
        pageFlip.destroy(); // Reset animasi jika upload buku baru
    }

    let jumlahHalaman = pdf.numPages;
    let daftarHalaman = [];

    // Proses pembuatan halaman
    for (let i = 1; i <= jumlahHalaman; i++) {
        let page = await pdf.getPage(i);
        let viewport = page.getViewport({ scale: 1.5 }); // Kualitas gambar (zoom)
        
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

    // Logika RTL (Jika Arab, urutan halaman dibalik dari belakang ke depan)
    if (modeRTL) {
        daftarHalaman.reverse();
    }

    // Memasukkan halaman ke layar
    daftarHalaman.forEach(hal => bukuDiv.appendChild(hal));

    // Mengaktifkan efek FlipHTML5 (Page Flip)
    let canvasPertama = bukuDiv.querySelector('canvas');
    let lebar = canvasPertama ? canvasPertama.width : 400;
    let tinggi = canvasPertama ? canvasPertama.height : 600;

    pageFlip = new StPageFlip.PageFlip(bukuDiv, {
        width: lebar,
        height: tinggi,
        size: "stretch",
        minWidth: 315,
        maxWidth: 1000,
        minHeight: 420,
        maxHeight: 1350,
        showCover: true,
        usePortrait: true, // Responsif untuk HP
        flippingTime: 700
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.lembaran'));

    // Pemicu suara kertas saat ditarik
    pageFlip.on('flip', (e) => {
        mainkanSuara();
    });
}

// Tombol Mode Baca
document.getElementById('btn-ltr').addEventListener('click', () => {
    modeRTL = false;
    alert("Mode Standar (Kiri-Kanan) aktif. Silakan upload (ulang) PDF Anda.");
});

document.getElementById('btn-rtl').addEventListener('click', () => {
    modeRTL = true;
    alert("Mode Arab (Kanan-Kiri) aktif. Silakan upload (ulang) PDF Anda.");
});

// Mengaktifkan Service Worker agar menjadi PWA (Bisa diinstal & Offline)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
        console.log('PWA Siap digunakan!');
    });
}
