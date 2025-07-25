# Deployment Guide: Digital Gift Platform on Ubuntu 24.04

This guide provides step-by-step instructions to deploy the Digital Gift application. The architecture consists of two main parts that you will deploy to different places:

1.  **The Backend Data Layer (on Cloudflare):**
    *   **Cloudflare R2:** For storing uploaded images.
    *   **Cloudflare KV:** For storing gift text data.
    *   **Cloudflare Worker:** A lightweight API for interacting with R2 and KV.

2.  **The Frontend & AI Proxy (on your VPS):**
    *   **React App:** The user interface.
    *   **Proxy Server:** A Node.js server that serves the React app and safely proxies AI requests to Gemini from your VPS's location, bypassing regional blocks.

You must deploy the Cloudflare services first, as the frontend depends on them.

---

### **Part 1: Get a Gemini API Key**

This is required for the "AI Assist" feature.
1.  Go to the Google AI Studio page: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2.  Sign up or log in with your Google account.
3.  Click "**Create API key**".
4.  **Immediately copy your new API key.** Store it somewhere safe; you will need it for Part 3.

---

### **Part 2: Deploy the Backend Data Layer (Cloudflare)**

This backend handles all gift data and image storage.

#### **Prerequisites**
- A [Cloudflare account](https://dash.cloudflare.com/sign-up).
- [Node.js](https://nodejs.org/) and `npm` installed on your **local machine**.

#### **Step 1: Install & Login with Wrangler CLI**
Wrangler is Cloudflare's command-line tool. Run these on your **local machine**.
```bash
npm install -g wrangler
wrangler login
```

#### **Step 2: Create a KV Namespace (for Text Data)**
1.  Go to your Cloudflare Dashboard -> **Workers & Pages** -> **KV**.
2.  Click **Create a namespace**, name it `digital-gifts-kv`, and click **Add**.
3.  After creation, **copy its ID**.

#### **Step 3: Create and Configure R2 Bucket (for Images)**

**A. Create the Bucket**
1.  In your Cloudflare Dashboard, go to **R2**.
2.  Click **Create bucket**, name it `digital-gifts-assets` (or another unique name), and click **Create bucket**.

**B. Enable Public Access (CRITICAL)**
1.  In your new bucket's settings page, go to the **Settings** tab.
2.  Find **Public URL** and click **Allow Access**.
3.  Use the free `r2.dev` subdomain provided. After enabling, **COPY THE PUBLIC URL**. It will look like `https://pub-xxxxxxxx.r2.dev`.

**C. Create an R2 API Token**
1.  From the R2 overview page, click **Manage R2 API Tokens** on the right.
2.  Click **Create API token**.
3.  Permissions: Choose **Object Admin Read & Write**.
4.  Click **Create API token**.
5.  **⚠️ Copy the `Access Key ID`, `Secret Access Key`, and your `Account ID` (found on the R2 overview page).**

**D. Add CORS Policy**
1.  In the bucket's **Settings** tab, scroll to **CORS Policy** and click **Add CORS policy**.
2.  Paste this JSON, replacing any existing content.
    ```json
    [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["PUT", "GET"],
        "AllowedHeaders": ["*"],
        "MaxAgeSeconds": 3600
      }
    ]
    ```
3.  Click **Save**. For better security in production, replace `"*"` with your specific domain.

#### **Step 4: Configure and Deploy the Worker**

<div style="background-color: #ffebe6; border-left: 4px solid #d9534f; padding: 15px; margin: 15px 0;">
  <p style="margin-top: 0; font-weight: bold; color: #d9534f;">CRITICAL: Install Backend Dependencies</p>
  <p style="margin-bottom: 0;">Navigate into the <code>worker/</code> directory on your local machine and run <code>npm install</code> before deploying.</p>
</div>

```bash
# On your local machine, navigate to the worker directory
cd worker
npm install
```

**Next, run the following commands** to securely store your credentials for the worker. The API key is **NOT** set here.
```bash
# Set your R2 Access Key ID
wrangler secret put R2_ACCESS_KEY_ID

# Set your R2 Secret Access Key
wrangler secret put R2_SECRET_ACCESS_KEY

# Set your Cloudflare Account ID
wrangler secret put R2_ACCOUNT_ID

# Set the public URL of your R2 bucket
wrangler secret put R2_PUBLIC_URL
```

**Now, configure `wrangler.toml`:**
1.  Open `worker/wrangler.toml`.
2.  **KV Namespace:** Find `[[kv_namespaces]]` and paste your KV Namespace ID.
3.  **R2 Bucket:** Find `[[r2_buckets]]` and `[vars]`. Ensure the `bucket_name` and `R2_BUCKET_NAME` **exactly match** your R2 bucket's name (e.g., `digital-gifts-assets`).

**Finally, deploy the worker:**
```bash
# Make sure you are still inside the worker/ directory
wrangler deploy
```
After deployment, Wrangler gives you a worker URL (e.g., `https://digital-gifts-api.<...>.workers.dev`). **Copy this worker URL.**

---

### **Part 3: Deploy Frontend & AI Proxy (Your VPS)**

This single server runs on your VPS. It both serves the static React UI and proxies AI requests. The following steps assume you are running commands from your VPS terminal.

#### **Step 1: Get Latest Code & Navigate to Project Root**
```bash
# Connect to your VPS if you haven't already
# ssh your_username@your_vps_ip_address

# Navigate to your project directory
cd /path/to/your/project

# Get the latest code
git pull origin main
```

#### **Step 2: Install Dependencies and Build Frontend**
These commands must be run from the **project root directory**.
```bash
# Make sure you are in the project root before running!
# e.g., /var/www/your-project

# Install/update root dependencies (for building the frontend)
npm install

# Build the static frontend files. This creates the `dist/` folder.
npm run build
```

#### **Step 3: Set Up Proxy Server & API Key**
Now, we will move into the `proxy-server` directory.
```bash
# Navigate into the proxy server directory
cd proxy-server

# Install/update proxy server dependencies
npm install

# Create the .env file (if it doesn't exist)
# Use nano, vim, or your preferred editor to create and edit the file
nano .env
```
Inside the `.env` file, add your Gemini API key. Save and exit (for `nano`, press `Ctrl+X`, then `Y`, then `Enter`):
```
API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### **Step 4: Restart the App with PM2 for a Clean Start**
To ensure a clean start, we will stop any old versions of the app before starting the new one.
```bash
# Make sure you are still in the proxy-server directory
# e.g., /var/www/your-project/proxy-server

# Stop and delete ANY old running versions to avoid port/process conflicts.
pm2 stop digital-gift-app || true
pm2 delete digital-gift-app || true

# Start the new version of the app.
# This command runs `npm run start` from this directory's package.json
pm2 start npm --name "digital-gift-app" -- run start -- --port 8003

# Save the new process list for reboots
pm2 save

# You can check the status and logs with:
# pm2 status
# pm2 logs digital-gift-app
```

#### **Step 5: Configure Firewall and PM2 Startup (First Time Only)**
```bash
sudo ufw allow 8003/tcp
pm2 startup
# (The startup command will output another command you need to copy and run)
```

Your application is now fully deployed and the AI Assistant should work!

---
### **Troubleshooting**
-   **`EADDRINUSE` Error in PM2 Logs:** The error `Error: listen EADDRINUSE: address already in use` means another program is already using the port. The restart procedure in Step 4 is designed to prevent this. If it still occurs, manually find and stop the process:
    ```bash
    # Check which process is using port 8003
    sudo lsof -i :8003
    # Look for the number in the `PID` column.
    # Stop it using its `PID` (replace `12345` with the actual PID):
    sudo kill -9 12345
    # Then try restarting with `pm2 restart digital-gift-app`.
    ```
- **Uploads/Deletions Fail:** The issue is almost always a misconfiguration between R2 and the Worker. Double-check your secrets, `wrangler.toml` bucket names, and the R2 CORS policy. Use `wrangler tail` on your local machine to see live logs from the deployed worker.
- **AI Assist Fails:** Check the PM2 logs for your `digital-gift-app` on the VPS (`pm2 logs digital-gift-app`). The error is likely an incorrect or missing `API_KEY` in the `.env` file within the `proxy-server` directory.
- **Site Doesn't Load:** Ensure the `npm run build` command was successful (in the project root) and the `dist` folder exists. Check PM2 logs.