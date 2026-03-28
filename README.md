# Kyeyune Ashiraf — Visual Designer Portfolio

A modern, fully-functional portfolio website for Kyeyune Ashiraf, featuring dynamic stats, contact forms, admin dashboard, and project tracking. Built with vanilla JavaScript and a Node.js backend with zero external dependencies.

---

## 🚀 Features

- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Dynamic Statistics** - Real-time visitor tracking and project view counts
- **Contact Form** - Full validation with backend storage and admin management
- **Admin Dashboard** - Secure admin panel to manage messages and view analytics
- **CV Download** - Track resume downloads with automatic PDF serving
- **Project Analytics** - Track which projects get the most attention
- **Zero Dependencies** - Runs on built-in Node.js modules only

---

## 📁 Project Structure

```
kyeyune-ashiraf-portfolio/
├── server.js                    ← Main backend server
├── package.json                 ← Node.js project configuration
├── README.md                    ← This file
├── .gitignore                   ← Git ignore rules
├── index.html                   ← Main portfolio website
├── admin.html                   ← Admin dashboard
├── Kyeyune_Ashiraf_CV.pdf       ← Resume/CV for download
├── data/                        ← Runtime data (auto-created)
│   ├── db.json                  ← Database (messages, stats, visitors)
│   └── access.log               ← Server access logs
├── assets/                      ← Static assets
│   └── (images, fonts, etc.)
└── .vscode/                     ← VS Code configuration
```

---

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js 18+** - [Download Node.js](https://nodejs.org/)

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd kyeyune-ashiraf-portfolio

# Start the server
npm start

# Or run directly
node server.js

# Development mode (auto-restart on changes)
npm run dev
```

The server will start at `http://localhost:3000` and display an admin token in the terminal.

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `ADMIN_TOKEN` | Random | Secret admin token (set for production) |

**Example:**
```bash
PORT=8080 ADMIN_TOKEN=your-secret-key node server.js
```

---

## 🌐 API Endpoints

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Main portfolio website |
| `GET` | `/admin` | Admin dashboard login page |
| `POST` | `/api/contact` | Submit contact form |
| `GET` | `/api/cv` | Download CV PDF |
| `POST` | `/api/project-view` | Track project views |
| `GET` | `/api/stats` | Get public statistics |

### Admin Endpoints (require `X-Admin-Token` header)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/dashboard` | Admin statistics overview |
| `GET` | `/admin/messages` | View all contact submissions |
| `DELETE` | `/admin/messages?id=<id>` | Delete specific message |
| `POST` | `/admin/reset-stats` | Reset all statistics |

---

## 📝 Contact Form API

**POST `/api/contact`**

```json
{
  "name": "John Doe",
  "email": "john@example.com", 
  "subject": "Design Project",
  "message": "I'd like to discuss a project...",
  "budget": "$5000",
  "timeline": "2 months"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Your message has been received. Ashiraf will be in touch shortly.",
  "ref": "abc123..."
}
```

---

## 🔐 Admin Access

1. Start the server to get the admin token
2. Visit `http://localhost:3000/admin`
3. Enter the token to access the dashboard
4. View messages, statistics, and manage data

**Example with curl:**
```bash
# Get admin token from server output, then:
curl -H "X-Admin-Token: YOUR_TOKEN" http://localhost:3000/admin/dashboard
```

---

## 🚀 Deployment

### VPS/Cloud Deployment

```bash
# 1. Upload files to server
scp -r . user@server:/var/www/portfolio/

# 2. Install PM2 for process management
npm install -g pm2

# 3. Start with PM2
cd /var/www/portfolio
pm2 start server.js --name "portfolio" --env PORT=3000

# 4. Setup PM2 startup
pm2 save
pm2 startup
```

### Environment Setup

```bash
# Production environment
export NODE_ENV=production
export PORT=3000
export ADMIN_TOKEN=your-secure-secret-here

# Start server
node server.js
```

### Nginx Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 💾 Data Storage

- **Database**: `data/db.json` - Stores messages, statistics, and visitor data
- **Logs**: `data/access.log` - Server access logs
- **Auto-backup**: Consider setting up automated backups of the `data/` folder

---

## 🛡️ Security Features

- **Input sanitization** - All user inputs are cleaned and validated
- **Rate limiting** - Body size limits prevent abuse
- **Admin authentication** - Token-based admin access
- **CORS enabled** - Proper cross-origin headers
- **Directory traversal protection** - Secure file serving

---

## 🎨 Customization

### Updating CV
Replace `Kyeyune_Ashiraf_CV.pdf` with your actual resume file.

### Modifying Styles
Edit the CSS in `index.html` and `admin.html` to customize colors, fonts, and layout.

### Adding Projects
Update the project data in the JavaScript section of `index.html`.

---

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=8080 node server.js
```

**Permission denied:**
```bash
# Make sure Node.js can write to data directory
chmod 755 data/
```

---

## 📄 License

MIT License - Feel free to use this portfolio template for your own projects.

---

## 👤 Author

**Kyeyune Ashiraf** - Visual Designer & Developer

- Portfolio: [Live Demo URL]
- Email: ashiraf@example.com
- Location: Uganda

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
