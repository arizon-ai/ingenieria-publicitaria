const { mdToPdf } = require('md-to-pdf');
const path = require('path');

async function main() {
    const inputPath = path.join(__dirname, 'conclusions.md');
    const outputPath = path.join(__dirname, 'conclusions.pdf');

    console.log('Generating PDF from:', inputPath);

    const pdf = await mdToPdf(
        { path: inputPath },
        {
            dest: outputPath,
            pdf_options: {
                format: 'A4',
                margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
                printBackground: true,
            },
            css: `
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 11px;
          line-height: 1.6;
          color: #1a1a2e;
        }
        h1 {
          color: #1a1a2e;
          border-bottom: 3px solid #e94560;
          padding-bottom: 8px;
          font-size: 22px;
        }
        h2 {
          color: #0f3460;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 5px;
          margin-top: 28px;
          font-size: 16px;
        }
        h3 {
          color: #16213e;
          font-size: 13px;
          margin-top: 18px;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 12px 0;
          font-size: 9.5px;
        }
        th {
          background: #0f3460;
          color: white;
          padding: 6px 8px;
          text-align: left;
          font-weight: 600;
        }
        td {
          padding: 5px 8px;
          border-bottom: 1px solid #eee;
        }
        tr:nth-child(even) {
          background: #f8f9fa;
        }
        strong {
          color: #e94560;
        }
        hr {
          border: none;
          border-top: 1px solid #ddd;
          margin: 20px 0;
        }
        blockquote {
          border-left: 4px solid #e94560;
          padding-left: 12px;
          color: #555;
          margin: 12px 0;
        }
        ul, ol {
          padding-left: 20px;
        }
        li {
          margin-bottom: 4px;
        }
        code {
          background: #f4f4f4;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 10px;
        }
      `,
            launch_options: {
                args: ['--no-sandbox'],
            },
        }
    );

    if (pdf) {
        console.log('✅ PDF generated successfully:', outputPath);
        console.log('   Size:', (pdf.content.length / 1024).toFixed(1), 'KB');
    }
}

main().catch(err => {
    console.error('Error generating PDF:', err.message);
    process.exit(1);
});
