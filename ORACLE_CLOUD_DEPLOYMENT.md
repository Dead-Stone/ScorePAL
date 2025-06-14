# 🚀 ScorePAL Deployment on Oracle Cloud Always Free

Deploy your complete ScorePAL application with all ML dependencies on Oracle Cloud's generous Always Free tier.

## 🎯 Why Oracle Cloud Always Free?

- **4 ARM CPUs + 24GB RAM** (forever free)
- **200GB storage** 
- **No billing required** after trial
- **Perfect for ML workloads** with heavy dependencies
- **No compromises** - run your full stack

## 📋 Prerequisites

1. Oracle Cloud account (free)
2. Your ScorePAL repository on GitHub
3. Basic SSH knowledge

## 🚀 Step-by-Step Deployment

### Step 1: Create Oracle Cloud Account

1. Go to: https://www.oracle.com/cloud/free/
2. Click "Start for free"
3. Sign up with your email
4. Choose "Always Free Account"
5. Complete verification (may require credit card for verification, but won't be charged)

### Step 2: Create Always Free VM Instance

1. **Login to Oracle Cloud Console**
2. **Navigate to:** Compute → Instances
3. **Click "Create Instance"**
4. **Configure:**
   - **Name:** scorepal-vm
   - **Placement:** Choose any availability domain
   - **Image:** Ubuntu 22.04 (recommended)
   - **Shape:** VM.Standard.A1.Flex (ARM-based, Always Free eligible)
   - **CPUs:** 4 (maximum free)
   - **Memory:** 24GB (maximum free)
   - **Boot Volume:** 200GB (maximum free)
5. **Networking:**
   - Create new VCN or use existing
   - Assign public IP
6. **SSH Keys:**
   - Generate new key pair or upload existing
   - **IMPORTANT:** Download private key for SSH access
7. **Click "Create"**

### Step 3: Configure Network Security

1. **Go to:** Networking → Virtual Cloud Networks
2. **Select your VCN** → Security Lists → Default Security List
3. **Add Ingress Rules:**
   ```
   Source: 0.0.0.0/0
   Protocol: TCP
   Port: 8000 (ScorePAL API)
   
   Source: 0.0.0.0/0
   Protocol: TCP
   Port: 8080 (Coolify - optional)
   ```

### Step 4: Connect to Your VM

```bash
# Replace with your VM's public IP and private key path
ssh -i /path/to/your/private-key.pem ubuntu@YOUR_VM_PUBLIC_IP
```

### Step 5: Run Setup Script

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/Dead-Stone/ScorePAL/main/oracle-cloud-setup.sh | bash

# Logout and login again to apply Docker group changes
exit
ssh -i /path/to/your/private-key.pem ubuntu@YOUR_VM_PUBLIC_IP
```

### Step 6: Deploy ScorePAL

```bash
# Clone your repository
git clone https://github.com/Dead-Stone/ScorePAL.git
cd ScorePAL

# Build and deploy with Docker Compose
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### Step 7: Access Your Application

- **ScorePAL API:** http://YOUR_VM_PUBLIC_IP:8000
- **Coolify Dashboard:** http://YOUR_VM_PUBLIC_IP:8080 (optional)

## 🔧 Management Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Update application
git pull
docker-compose build
docker-compose up -d

# Stop services
docker-compose down

# Monitor resources
htop
docker stats
```

## 🎯 Benefits of This Setup

✅ **Full ML Stack:** All OCR engines (PaddleOCR, EasyOCR, Tesseract)  
✅ **24GB RAM:** Handle large documents and models  
✅ **4 ARM CPUs:** Excellent performance  
✅ **200GB Storage:** Plenty of space for data  
✅ **Always Free:** No ongoing costs  
✅ **No Compromises:** Complete functionality preserved  

## 🔍 Troubleshooting

### If build fails due to memory:
```bash
# Add swap space
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### If ports are not accessible:
```bash
# Check firewall
sudo ufw status
sudo ufw allow 8000/tcp

# Check Oracle Cloud security lists (in web console)
```

### Monitor resource usage:
```bash
# Check memory and CPU
free -h
htop

# Check Docker containers
docker stats
```

## 🎉 Success!

Your ScorePAL application is now running on Oracle Cloud Always Free with:
- Complete ML functionality
- All OCR engines available
- 24GB RAM for processing
- No ongoing costs
- Professional deployment setup

Access your application at: **http://YOUR_VM_PUBLIC_IP:8000**