export function getVerificationEmailTemplate(verificationUrl: string, name: string) {
  return {
    subject: 'Zuni - Email Adresinizi Doğrulayın',
    html: `
      <!DOCTYPE html>
      <html lang="tr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light">
          <meta name="supported-color-schemes" content="light">
          <title>Email Doğrulama</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
            
            :root {
              color-scheme: light;
              supported-color-schemes: light;
            }

            body {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #000000 !important;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #FFFDF5 !important;
              -webkit-font-smoothing: antialiased;
            }

            /* Force light mode for Outlook and other clients */
            [data-ogsc] body {
              background-color: #FFFDF5 !important;
              color: #000000 !important;
            }

            @media (prefers-color-scheme: dark) {
              body, .container {
                background-color: #ffffff !important;
                color: #000000 !important;
              }
              .logo-text, .title, .content, p, strong {
                color: #000000 !important;
              }
              .footer p {
                color: #8899AC !important;
              }
            }

            .container {
              background-color: #ffffff !important;
              border: 3px solid #000000 !important;
              border-radius: 16px;
              padding: 40px;
              box-shadow: 6px 6px 0px #000000;
            }
            .header {
              text-align: center;
              margin-bottom: 35px;
            }
            .logo-wrapper {
              display: inline-block;
              margin-bottom: 15px;
            }
            .logo-ball {
              width: 48px;
              height: 48px;
              background-color: #FFE066 !important;
              background-image: linear-gradient(#FFE066, #FFE066) !important;
              border: 3px solid #000000 !important;
              border-radius: 50%;
              box-shadow: 3px 3px 0px #000000;
              display: inline-block;
              position: relative;
            }
            .logo-highlight {
              position: absolute;
              top: 6px;
              left: 6px;
              width: 8px;
              height: 8px;
              background-color: rgba(255, 255, 255, 0.4) !important;
              border-radius: 50%;
            }
            .logo-text {
              font-size: 32px;
              font-weight: 900;
              color: #000000 !important;
              letter-spacing: -1.5px;
              margin-top: 10px;
              display: block;
            }
            .title {
              font-size: 26px;
              font-weight: 800;
              color: #000000 !important;
              margin-bottom: 20px;
              text-align: center;
              letter-spacing: -0.5px;
            }
            .content {
              font-size: 16px;
              line-height: 1.7;
              margin-bottom: 30px;
              color: #333333 !important;
            }
            .button-container {
              text-align: center;
              margin: 35px 0;
            }
            .button {
              display: inline-block;
              background-color: #FFE066 !important;
              background-image: linear-gradient(#FFE066, #FFE066) !important;
              color: #000000 !important;
              padding: 18px 36px;
              text-decoration: none;
              font-weight: 800;
              font-size: 18px;
              border: 3px solid #000000 !important;
              border-radius: 12px;
              box-shadow: 4px 4px 0px #000000;
              text-align: center;
            }
            .footer {
              margin-top: 40px;
              padding-top: 25px;
              border-top: 2px solid #eeeeee;
              font-size: 13px;
              color: #8899AC;
              text-align: center;
            }
            .alt-link-container {
              background-color: #f8fafc;
              border: 2px dashed #e2e8f0;
              padding: 15px;
              margin-top: 30px;
              border-radius: 10px;
              font-size: 12px;
              word-break: break-all;
            }
            .alt-link-title {
              font-weight: 700;
              color: #64748b;
              margin-bottom: 5px;
              display: block;
            }
            .highlight-pink {
              color: #FF6B9D;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-wrapper">
                <div class="logo-ball" style="background-color: #FFE066 !important; background-image: linear-gradient(#FFE066, #FFE066) !important;">
                  <div class="logo-highlight"></div>
                </div>
                <span class="logo-text">Zuni</span>
              </div>
            </div>
            
            <h1 class="title">Email Adresinizi Doğrulayın</h1>
            
            <div class="content">
              <p>Merhaba <strong>${name}</strong>,</p>
              
              <p>Zuni'ye hoş geldin! Üniversiteli arkadaşlarınla anonim ve güvenli bir şekilde fikirlerini paylaşmaya başlamadan önce email adresini doğrulaman gerekiyor.</p>
              
              <div class="button-container">
                <a href="${verificationUrl}" class="button" style="background-color: #FFE066 !important; background-image: linear-gradient(#FFE066, #FFE066) !important; color: #000000 !important;">Hesabımı Doğrula</a>
              </div>
              
              <p>Doğrulama linki 24 saat boyunca geçerlidir. Eğer butona tıklayamıyorsan, aşağıdaki linki tarayıcına yapıştırabilirsin.</p>
            </div>
            
            <div class="alt-link-container">
              <span class="alt-link-title">Buton çalışmıyor mu? Bu linki kullan:</span>
              <a href="${verificationUrl}" style="color: #2563eb; text-decoration: none;">${verificationUrl}</a>
            </div>
            
            <div class="footer">
              <p>Bu email otomatik olarak gönderilmiştir. Eğer bu hesabı sen oluşturmadıysan bu mesajı görmezden gelebilirsin.</p>
              <p>© 2025 <span class="highlight-pink">Zuni</span>. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Zuni - Email Adresinizi Doğrulayın
      
      Merhaba ${name},
      
      Zuni'ye hoş geldin! Üniversiteli arkadaşlarınla anonim ve güvenli bir şekilde fikirlerini paylaşmaya başlamadan önce email adresini doğrulaman gerekiyor.
      
      Email adresinizi doğrulamak için aşağıdaki linke tıklayın:
      ${verificationUrl}
      
      Bu link 24 saat geçerlidir.
      
      Eğer bu hesabı sen oluşturmadıysan bu mesajı görmezden gelebilirsin.
      
      © 2025 Zuni. Tüm hakları saklıdır.
    `
  };
}
