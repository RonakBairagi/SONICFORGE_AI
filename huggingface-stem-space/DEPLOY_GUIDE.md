# Step-by-Step Deployment Guide: Hugging Face Spaces (Gradio + ZeroGPU)
### Free AI Audio Stem Separation for SonicForge AI

Follow these exact steps to host your Demucs stem separation engine for free on Hugging Face Spaces.

---

## Prerequisites (100% Free)
- A free Hugging Face account ([huggingface.co/join](https://huggingface.co/join)).
- Zero credit cards or payment details required.

---

## Step 1: Create a New Gradio Space
1. Log in to [huggingface.co](https://huggingface.co).
2. Click your profile avatar in the top-right corner and select **New Space** (or go directly to [huggingface.co/new-space](https://huggingface.co/new-space)).
3. Fill in the Space settings:
   - **Space name:** `sonicforge-demucs` (or any name you like).
   - **License:** `mit` (or `apache-2.0`).
   - **Select the Space SDK:** Click **Gradio** (⚠️ **Do NOT choose Docker**).
   - **Gradio template:** Select **Blank**.
   - **Space Hardware:**
     - If your account shows **ZeroGPU** (Nvidia A100 slice, free), select **ZeroGPU**.
     - If ZeroGPU is not selectable (e.g. account is less than 30 days old), select **CPU basic • 2 vCPU • 16 GB RAM • Free**. The app automatically runs on both!
   - **Visibility:** Select **Public**.
4. Click **Create Space**.

---

## Step 2: Upload the Deployment Files
Hugging Face will display your new Space repository.

### Option A: Upload Directly via the Web Browser (Easiest)
1. On your new Space page, click the **Files** tab.
2. Click **Add file** -> **Upload files**.
3. From your computer, open the folder:
   `C:\Users\RONAK\New folder (16)\huggingface-stem-space`
4. Drag and drop these 3 files into the browser:
   - `app.py`
   - `requirements.txt`
   - `README.md`
5. At the bottom, click **Commit changes to main**.

---

### Option B: Push Using Git Terminal
In a new terminal window:
```bash
cd "C:\Users\RONAK\New folder (16)\huggingface-stem-space"
git init
git remote add origin https://huggingface.co/spaces/YOUR_USERNAME/sonicforge-demucs
git add .
git commit -m "Deploy Demucs Gradio Engine"
git push -u origin main
```

---

## Step 3: Wait for Build to Complete
1. Return to the **App** tab on your Space.
2. You will see: `Building...` -> `Running`.
3. The build takes approximately 2–3 minutes while Hugging Face installs PyTorch and Demucs.
4. When it says **Running**, you will see the interactive SonicForge Demucs UI!
5. You can test it immediately right inside Hugging Face by uploading an MP3 and clicking **⚡ Separate Stems**.

---

## Step 4: Obtain Your Space URL or Space ID
Your Space has two identifiers that work with SonicForge AI:
1. **Space ID (Recommended):**
   `YOUR_USERNAME/sonicforge-demucs`
   *(Example: `ronakbairagi/sonicforge-demucs`)*
2. **Direct HTTPS URL:**
   On your Space page, click the three vertical dots (⋮) near the top right, select **Embed this Space**, and copy the Direct URL:
   `https://YOUR_USERNAME-sonicforge-demucs.hf.space`

---

## Step 5: Configure Vercel Environment Variables
1. Go to your Vercel Dashboard at [vercel.com](https://vercel.com).
2. Click your **SonicForge AI** project.
3. Navigate to **Settings** -> **Environment Variables**.
4. Add the following variable:
   - **Key:** `NEXT_PUBLIC_STEM_API_URL`
   - **Value:** `https://YOUR_USERNAME-sonicforge-demucs.hf.space`
     *(Or enter your Space ID: `YOUR_USERNAME/sonicforge-demucs`)*
5. Ensure the checkboxes for **Production**, **Preview**, and **Development** are checked.
6. Click **Save**.

---

## Step 6: Redeploy Your Vercel Frontend
1. In Vercel, go to the **Deployments** tab.
2. Click the three dots (⋮) on your latest production deployment and select **Redeploy**.
3. Wait ~45 seconds for Vercel to rebuild with the new environment variable.

---

## Step 7: Test Live on Your Deployed Website
1. Open your live website: `https://your-app.vercel.app/stems`.
2. Notice the engine badge at the top:
   `Demucs Online (Hugging Face ZeroGPU)` or `Demucs Online (Hugging Face Space)`.
3. Drop an audio track (e.g. `Khairiyat Chhichhore 128 Kbps (1).mp3`).
4. Click **Separate Stems (Demucs AI)**.
5. Watch the real-time progress:
   - *Connecting to Hugging Face Demucs Space...*
   - *Uploading audio directly to Demucs Space...*
   - *Demucs neural source separation in progress on Hugging Face...*
   - *Separation complete! Lossless stems ready.*
6. The Synchronized Multitrack Mixer will load with all 4 stems (`Vocals`, `Drums`, `Bass`, `Other Instruments`) ready to play, solo, mute, and download!
