# Deployment Guide - POS System on AWS EC2 (Ubuntu)

This guide will walk you through deploying your Next.js POS System to an AWS EC2 Ubuntu server using the server's Public IP address.

## Prerequisites

- AWS EC2 instance running Ubuntu 20.04 or later
- SSH access to your EC2 instance
- Your EC2 instance's Public IP address
- AWS Security Group configured to allow:
  - SSH (Port 22) from your IP
  - HTTP (Port 80) from anywhere (0.0.0.0/0)
  - HTTPS (Port 443) from anywhere (optional, for future SSL setup)

---

## Step 1: Connect to Your EC2 Instance

```bash
# Replace YOUR_KEY.pem and YOUR_PUBLIC_IP with your actual values
ssh -i ~/.ssh/YOUR_KEY.pem ubuntu@YOUR_PUBLIC_IP
```

---

## Step 2: Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

---

## Step 3: Install Node.js (v20)

```bash
# Install Node.js 20.x using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

---

## Step 4: Install Git

```bash
sudo apt install -y git

# Verify installation
git --version
```

---

## Step 5: Install Nginx

```bash
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx
```

---

## Step 6: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

---

## Step 7: Clone Your Repository

```bash
# Navigate to a suitable directory (using home directory)
cd ~

# Clone your repository (replace with your actual repo URL)
# Option 1: If using GitHub/GitLab with SSH
git clone git@github.com:YOUR_USERNAME/YOUR_REPO.git pos-system

# Option 2: If using HTTPS
# git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git pos-system

# Navigate into the project directory
cd pos-system
```

**Note:** If you don't have a Git repository yet, you can:
1. Create a repository on GitHub/GitLab
2. Push your code to it
3. Then clone it on the server

Or, you can use `scp` to transfer files directly:
```bash
# From your local machine
scp -i ~/.ssh/YOUR_KEY.pem -r /path/to/pos-js ubuntu@YOUR_PUBLIC_IP:~/
```

---

## Step 8: Install Project Dependencies

```bash
# Make sure you're in the project directory
cd ~/pos-system  # or wherever you cloned/uploaded the project

# Install dependencies
npm install
```

---

## Step 9: Set Up Environment Variables

```bash
# Create the .env file
nano .env
```

Add the following content (replace `YOUR_PUBLIC_IP` with your actual EC2 Public IP):

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# Authentication Secret (generate a strong random string)
AUTH_SECRET="your-super-secret-key-change-this-to-a-random-string-min-32-chars"

# NextAuth URL (use your EC2 Public IP)
NEXTAUTH_URL="http://YOUR_PUBLIC_IP"

# Node Environment
NODE_ENV="production"
```

**Important Notes:**
- Replace `YOUR_PUBLIC_IP` with your actual EC2 instance Public IP (e.g., `http://54.123.45.67`)
- Generate a strong `AUTH_SECRET` (at least 32 characters). You can generate one using:
  ```bash
  openssl rand -base64 32
  ```
- Save the file: Press `Ctrl + X`, then `Y`, then `Enter`

---

## Step 10: Generate Prisma Client

```bash
npx prisma generate
```

---

## Step 11: Initialize Database

```bash
# Push the schema to create the database
npx prisma db push

# (Optional) Seed the database with initial data
npm run db:seed
```

---

## Step 12: Build the Next.js Application

```bash
npm run build
```

This will create the production build in the `.next` directory.

---

## Step 13: Configure PM2 to Run the Application

```bash
# Start the application with PM2
pm2 start npm --name "pos-system" -- start

# Save PM2 configuration to restart on server reboot
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions shown (usually run a sudo command)
```

**Verify PM2 is running:**
```bash
pm2 status
pm2 logs pos-system
```

---

## Step 14: Configure Nginx as Reverse Proxy

```bash
# Backup the default Nginx configuration
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Edit the Nginx configuration
sudo nano /etc/nginx/sites-available/default
```

Replace the entire content with the following (replace `YOUR_PUBLIC_IP` with your actual IP):

```nginx
server {
    listen 80;
    server_name _;  # Accept traffic from any domain/IP

    # Increase body size limit for file uploads (backup/restore)
    client_max_body_size 50M;

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

Save the file: `Ctrl + X`, then `Y`, then `Enter`

**Test Nginx configuration:**
```bash
sudo nginx -t
```

**Reload Nginx:**
```bash
sudo systemctl reload nginx
```

---

## Step 15: Configure AWS Security Group

1. Go to AWS Console → EC2 → Security Groups
2. Select your EC2 instance's security group
3. Add an **Inbound Rule**:
   - **Type:** HTTP
   - **Protocol:** TCP
   - **Port:** 80
   - **Source:** 0.0.0.0/0 (or restrict to specific IPs for security)

---

## Step 16: Access Your Application

Open your browser and navigate to:
```
http://YOUR_PUBLIC_IP
```

You should see your POS System login page!

---

## Step 17: Create Initial Admin User

If you haven't seeded the database, you'll need to create an admin user. You can do this by:

1. **Option A: Using Prisma Studio (Recommended)**
   ```bash
   # On the server, run Prisma Studio
   npx prisma studio
   ```
   Then access it via SSH tunnel:
   ```bash
   # On your local machine
   ssh -i ~/.ssh/YOUR_KEY.pem -L 5555:localhost:5555 ubuntu@YOUR_PUBLIC_IP
   ```
   Open `http://localhost:5555` in your browser and create a user.

2. **Option B: Using the seed script**
   ```bash
   npm run db:seed
   ```
   (Make sure your seed script creates an admin user)

3. **Option C: Direct SQLite access**
   ```bash
   sqlite3 prisma/dev.db
   # Then manually insert a user (not recommended)
   ```

---

## Useful Commands

### PM2 Commands
```bash
# View application status
pm2 status

# View logs
pm2 logs pos-system

# Restart application
pm2 restart pos-system

# Stop application
pm2 stop pos-system

# View real-time logs
pm2 logs pos-system --lines 50
```

### Nginx Commands
```bash
# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

### Database Commands
```bash
# Open Prisma Studio
npx prisma studio

# Push schema changes
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

---

## Troubleshooting

### Application Not Starting
```bash
# Check PM2 logs
pm2 logs pos-system

# Check if port 3000 is in use
sudo lsof -i :3000

# Restart PM2
pm2 restart pos-system
```

### Nginx 502 Bad Gateway
```bash
# Check if Next.js app is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify Next.js is listening on port 3000
sudo netstat -tlnp | grep 3000
```

### Database Issues
```bash
# Check database file exists
ls -la prisma/dev.db

# Check file permissions
ls -l prisma/

# Fix permissions if needed
chmod 644 prisma/dev.db
```

### Can't Access from Browser
1. Check AWS Security Group allows Port 80
2. Check EC2 instance has a Public IP
3. Verify Nginx is running: `sudo systemctl status nginx`
4. Check firewall: `sudo ufw status` (should allow HTTP)

---

## Updating the Application

For future updates, use the provided deployment script:

```bash
# Make the script executable (first time only)
chmod +x scripts/deploy.sh

# Run the deployment script
./scripts/deploy.sh
```

Or manually:
```bash
git pull
npm install
npx prisma db push
npm run build
pm2 restart pos-system
```

---

## Security Recommendations

1. **Change Default SSH Port** (optional but recommended)
2. **Set up SSL/HTTPS** using Let's Encrypt (requires a domain name)
3. **Restrict Security Group** to specific IPs instead of 0.0.0.0/0
4. **Regular Backups** of the database file (`prisma/dev.db`)
5. **Keep System Updated**: `sudo apt update && sudo apt upgrade`
6. **Use Strong Passwords** for all user accounts
7. **Enable AWS CloudWatch** for monitoring

---

## Backup Strategy

### Manual Database Backup
```bash
# Create a backup
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)

# Or use the built-in backup feature in Settings → System
```

### Automated Backup (Optional)
Create a cron job to backup the database daily:
```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cp /home/ubuntu/pos-system/prisma/dev.db /home/ubuntu/backups/dev.db.$(date +\%Y\%m\%d)
```

---

## Next Steps (Optional)

1. **Set up a Domain Name** and configure DNS
2. **Install SSL Certificate** using Let's Encrypt
3. **Set up Automated Backups** to S3
4. **Configure Monitoring** with PM2 Plus or CloudWatch
5. **Set up CI/CD** pipeline for automated deployments

---

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs pos-system`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify all environment variables are set correctly
4. Ensure all ports are open in AWS Security Group

---

**Congratulations!** Your POS System should now be running on AWS EC2! 🎉

