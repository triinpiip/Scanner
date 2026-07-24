const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const videoEl = document.getElementById('video');

let products = [];
let lastDetectedCode = null;
let lastDetectionTime = 0;

function setStatus(message) {
  statusEl.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadProducts() {
  try {
    const response = await fetch('./products.json');
    if (!response.ok) {
      throw new Error(`Unable to load products.json (${response.status})`);
    }

    products = await response.json();
    setStatus(`Loaded ${products.length} product entries.`);
  } catch (error) {
    console.error(error);
    setStatus('Could not load the product catalog.');
    resultEl.innerHTML = '<p class="muted">The product database could not be loaded.</p>';
  }
}

function findProduct(code) {
  const normalizedCode = String(code).trim().toUpperCase();
  return products.find((product) => String(product.code).trim().toUpperCase() === normalizedCode);
}

function renderProduct(product) {
  resultEl.innerHTML = `
    <h2>Product found</h2>
    <p><strong>Code:</strong> ${escapeHtml(product.code)}</p>
    <p><strong>Name:</strong> ${escapeHtml(product.name)}</p>
    <p><strong>Location:</strong> ${escapeHtml(product.location)}</p>
    <p><strong>Quantity:</strong> ${escapeHtml(product.qty)}</p>
  `;
}

function renderNotFound(code) {
  resultEl.innerHTML = `
    <h2>No matching product</h2>
    <p><strong>Scanned code:</strong> ${escapeHtml(code)}</p>
    <p class="muted">This code was not found in the local catalog.</p>
  `;
}

function handleScan(code) {
  const now = Date.now();
  if (code === lastDetectedCode && now - lastDetectionTime < 2500) {
    return;
  }

  lastDetectedCode = code;
  lastDetectionTime = now;

  const product = findProduct(code);
  if (product) {
    renderProduct(product);
    setStatus(`Scanned: ${code}`);
  } else {
    renderNotFound(code);
    setStatus(`No product found for ${code}`);
  }
}

function startScanner() {
  if (typeof Quagga === 'undefined') {
    setStatus('The barcode library did not load.');
    return;
  }

  Quagga.init(
    {
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: videoEl,
        constraints: {
          facingMode: 'environment'
        }
      },
      decoder: {
        readers: ['code_128_reader']
      },
      locate: true
    },
    function (error) {
      if (error) {
        console.error(error);
        setStatus('Camera access was blocked or is unavailable.');
        resultEl.innerHTML = '<p class="muted">Please allow camera access and open this page over HTTPS.</p>';
        return;
      }

      setStatus('Camera ready. Point at a barcode.');
      Quagga.start();
    }
  );

  Quagga.onDetected(function (result) {
    const code = result.codeResult.code;
    handleScan(code);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  startScanner();
});
