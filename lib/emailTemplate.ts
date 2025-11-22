export function getVerificationEmailTemplate(verificationUrl: string, name: string) {
  return {
    subject: 'Zuni - Email Adresinizi Doğrulayın',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Doğrulama</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border: 4px solid #000;
              border-radius: 0;
              padding: 40px;
              box-shadow: 8px 8px 0px #000;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 32px;
              font-weight: 900;
              color: #000;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              font-weight: 700;
              color: #000;
              margin-bottom: 20px;
            }
            .content {
              font-size: 16px;
              line-height: 1.8;
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background-color: #fbbf24;
              color: #000;
              padding: 16px 32px;
              text-decoration: none;
              font-weight: 700;
              font-size: 16px;
              border: 3px solid #000;
              border-radius: 0;
              box-shadow: 4px 4px 0px #000;
              transition: all 0.2s;
              text-align: center;
              margin: 20px 0;
            }
            .button:hover {
              transform: translate(2px, 2px);
              box-shadow: 2px 2px 0px #000;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #000;
              font-size: 14px;
              color: #666;
              text-align: center;
            }
            .warning {
              background-color: #fef3c7;
              border: 2px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Zuni</div>
              <h1 class="title">Email Adresinizi Doğrulayın</h1>
            </div>
            
            <div class="content">
              <p>Merhaba <strong>${name}</strong>,</p>
              
              <p>Zuni'ye hoş geldiniz! Hesabınızı aktifleştirmek için email adresinizi doğrulamanız gerekiyor.</p>
              
              <p>Aşağıdaki butona tıklayarak email adresinizi doğrulayabilirsiniz:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Email Adresimi Doğrula</a>
              </div>
              
              <div class="warning">
                <strong>Önemli:</strong> Bu link 24 saat geçerlidir. Eğer buton çalışmıyorsa, aşağıdaki linki tarayıcınıza kopyalayabilirsiniz:
                <br><br>
                <a href="${verificationUrl}" style="word-break: break-all; color: #2563eb;">${verificationUrl}</a>
              </div>
              
              <p>Eğer bu hesabı siz oluşturmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
            </div>
            
            <div class="footer">
              <p>Bu email otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
              <p>© 2024 Zuni. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Zuni - Email Adresinizi Doğrulayın
      
      Merhaba ${name},
      
      Zuni'ye hoş geldiniz! Hesabınızı aktifleştirmek için email adresinizi doğrulamanız gerekiyor.
      
      Email adresinizi doğrulamak için aşağıdaki linke tıklayın:
      ${verificationUrl}
      
      Bu link 24 saat geçerlidir.
      
      Eğer bu hesabı siz oluşturmadıysanız, bu emaili görmezden gelebilirsiniz.
      
      Bu email otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
      
      © 2024 Zuni. Tüm hakları saklıdır.
    `
  };
}
