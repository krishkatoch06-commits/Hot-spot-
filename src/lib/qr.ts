import QRCode from 'qrcode';

export async function generateQrDataUrl(url: string, options?: { width?: number; margin?: number }): Promise<string> {
  return QRCode.toDataURL(url, {
    width: options?.width || 800,
    margin: options?.margin || 2,
    color: {
      dark: '#1E1E24',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });
}

export function downloadQrCode(dataUrl: string, filename: string = 'hotspot-restaurant-menu-qr.png') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printTableStandee(params: {
  restaurantName: string;
  tagline: string;
  qrDataUrl: string;
  menuUrl: string;
}) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print QR Table Standee - ${params.restaurantName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #FAF7F2;
            color: #1E1E24;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 95vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .standee-card {
            background: #ffffff;
            border: 2px solid #C85A32;
            border-radius: 24px;
            padding: 40px;
            text-align: center;
            max-width: 480px;
            box-shadow: 0 10px 30px rgba(200, 90, 50, 0.12);
          }
          .badge {
            background: #FBEFE9;
            color: #C85A32;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            padding: 6px 16px;
            border-radius: 999px;
            display: inline-block;
            margin-bottom: 16px;
          }
          h1 {
            font-size: 36px;
            margin: 0 0 8px 0;
            color: #C85A32;
          }
          p.tagline {
            font-size: 16px;
            color: #6B696F;
            margin: 0 0 24px 0;
          }
          .qr-box {
            background: #FAF7F2;
            padding: 16px;
            border-radius: 16px;
            display: inline-block;
            margin-bottom: 24px;
            border: 1px dashed #C85A32;
          }
          .qr-box img {
            width: 280px;
            height: 280px;
            display: block;
          }
          .steps {
            text-align: left;
            background: #FDFBF7;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 24px;
            font-size: 14px;
            line-height: 1.6;
          }
          .steps ol {
            margin: 0;
            padding-left: 20px;
          }
          .footer-url {
            font-size: 13px;
            color: #8C8A90;
            word-break: break-all;
          }
          @media print {
            body {
              background: #fff;
            }
            .standee-card {
              box-shadow: none;
              border: 2px solid #C85A32;
            }
          }
        </style>
      </head>
      <body>
        <div class="standee-card">
          <div class="badge">Contactless Dining</div>
          <h1>${params.restaurantName}</h1>
          <p class="tagline">${params.tagline}</p>
          
          <div class="qr-box">
            <img src="${params.qrDataUrl}" alt="Scan QR Menu" />
          </div>

          <div class="steps">
            <ol>
              <li>Scan this QR code with your phone camera</li>
              <li>Select your table number on screen</li>
              <li>Browse our fresh menu and place your order</li>
              <li>Track live kitchen preparation in real time!</li>
            </ol>
          </div>

          <div class="footer-url">
            Direct Link: <strong>${params.menuUrl}</strong>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
