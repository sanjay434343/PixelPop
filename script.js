let currentType = 'wallpaper';
    let generatedImages = [];
    let currentViewerIndex = 0;

    // Material Design Snackbar
    function showSnackbar(message) {
      const existingSnackbar = document.querySelector('.snackbar');
      if (existingSnackbar) {
        existingSnackbar.remove();
      }

      const snackbar = document.createElement('div');
      snackbar.className = 'snackbar';
      snackbar.textContent = message;
      document.body.appendChild(snackbar);

      setTimeout(() => {
        snackbar.style.animation = 'snackbarSlide 0.3s ease-out reverse';
        setTimeout(() => snackbar.remove(), 300);
      }, 3000);
    }

    // Input sanitization
    function sanitizeInput(input) {
      return input
        .replace(/[<>\"'&]/g, '')
        .replace(/script/gi, '')
        .trim()
        .substring(0, 500);
    }

    // Set button loading state
    function setButtonLoading(button, isLoading) {
      if (isLoading) {
        button.classList.add('button-loading');
        button.disabled = true;
        button.innerHTML = '<div class="loading-spinner"></div>';
      } else {
        button.classList.remove('button-loading');
        button.disabled = false;
        // Restore original content - we'll need to track this
      }
    }

    // Enhanced prompt with AI
    async function enhancePrompt() {
      const promptInput = document.getElementById("promptInput");
      const userPrompt = sanitizeInput(promptInput.value);
      
      if (!userPrompt) {
        showSnackbar("Please enter a prompt to enhance");
        promptInput.focus();
        return;
      }

      const enhanceBtn = document.querySelector('.material-button.secondary');
      const originalContent = enhanceBtn.innerHTML;
      setButtonLoading(enhanceBtn, true);

      const enhancementPrompt = `Transform this into a detailed, professional image generation prompt with specific visual elements, lighting, composition, and style details: ${userPrompt}`;
      
      try {
        const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(enhancementPrompt)}`);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const enhanced = await response.text();
        const cleanEnhanced = sanitizeInput(enhanced);
        
        if (cleanEnhanced && cleanEnhanced.length > 10) {
          promptInput.value = cleanEnhanced;
          showSnackbar("Prompt enhanced successfully!");
        } else {
          throw new Error("Invalid response");
        }
        
      } catch (error) {
        console.error('Enhancement error:', error);
        showSnackbar("Enhancement failed. Please try again.");
      } finally {
        enhanceBtn.innerHTML = originalContent;
        enhanceBtn.classList.remove('button-loading');
        enhanceBtn.disabled = false;
      }
    }

    // Generate 3 images
    async function generateImages(type) {
      const promptInput = document.getElementById("promptInput");
      const prompt = sanitizeInput(promptInput.value);
      
      if (!prompt) {
        showSnackbar("Please enter a prompt first!");
        promptInput.focus();
        return;
      }

      if (prompt.length < 5) {
        showSnackbar("Please enter a more detailed prompt");
        return;
      }

      currentType = type;
      generatedImages = [];

      // Show loading screen
      document.getElementById('loadingScreen').classList.add('active');

      const width = type === 'wallpaper' ? 1080 : 1080;
      const height = type === 'wallpaper' ? 1920 : 1080;
      
      const enhancedPrompt = `${prompt}, ultra high quality, professional, detailed, 8k resolution, masterpiece`;

      // Generate 3 different images with different seeds
      const seeds = [
        Math.floor(Math.random() * 100000),
        Math.floor(Math.random() * 100000),
        Math.floor(Math.random() * 100000)
      ];

      try {
        const imagePromises = seeds.map(seed => {
          const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;
          
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({
              url: imageUrl,
              seed: seed,
              width: width,
              height: height,
              type: type
            });
            img.onerror = () => reject(new Error(`Failed to load image with seed ${seed}`));
            img.src = imageUrl;
          });
        });

        // Wait for all images to load
        generatedImages = await Promise.all(imagePromises);
        
        // Hide loading screen and show results
        document.getElementById('loadingScreen').classList.remove('active');
        showResults();
        showSnackbar(`${generatedImages.length} ${type}s generated successfully!`);

      } catch (error) {
        console.error('Generation error:', error);
        document.getElementById('loadingScreen').classList.remove('active');
        showSnackbar("Some images failed to generate. Please try again.");
        
        // Show any images that did load
        if (generatedImages.length > 0) {
          showResults();
        }
      }
    }

    // Show results in gallery view
    function showResults() {
      const resultsGrid = document.getElementById('resultsGrid');
      const downloadGrid = document.getElementById('downloadGrid');
      resultsGrid.innerHTML = '';
      downloadGrid.innerHTML = '';

      // Create gallery items
      generatedImages.forEach((image, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.onclick = () => openViewer(index);
        
        galleryItem.innerHTML = `
          <img src="${image.url}" alt="Generated ${image.type} ${index + 1}" class="gallery-image">
          <div class="gallery-overlay">
            <div class="gallery-overlay-content">
              <div class="gallery-icon">
                <span class="material-icons">zoom_in</span>
              </div>
              <div class="gallery-info">${image.type === 'wallpaper' ? 'Wallpaper' : 'Profile Picture'} ${index + 1}</div>
              <div class="gallery-dimensions">${image.width} × ${image.height}px</div>
            </div>
          </div>
        `;
        
        resultsGrid.appendChild(galleryItem);

        // Create download items
        const downloadItem = document.createElement('div');
        downloadItem.className = 'download-item';
        
        downloadItem.innerHTML = `
          <img src="${image.url}" alt="Preview" class="download-preview">
          <div class="download-info">
            <div class="download-title">${image.type === 'wallpaper' ? 'Wallpaper' : 'Profile Picture'} ${index + 1}</div>
            <div class="download-size">${image.width} × ${image.height}px • PNG</div>
          </div>
          <button class="download-btn-small" onclick="downloadImage('${image.url}', '${image.type}', ${image.seed})">
            <span class="material-icons" style="font-size: 16px;">download</span>
            Download
          </button>
        `;
        
        downloadGrid.appendChild(downloadItem);
      });

      document.getElementById('resultsPage').classList.add('active');
    }

    // Open image viewer
    function openViewer(index) {
      currentViewerIndex = index;
      const image = generatedImages[index];
      
      document.getElementById('viewerImage').src = image.url;
      document.getElementById('viewerInfo').textContent = 
        `Image ${index + 1} of ${generatedImages.length} • ${image.width} × ${image.height}px`;
      
      document.getElementById('imageViewer').classList.add('active');
    }

    // Close image viewer
    function closeViewer() {
      document.getElementById('imageViewer').classList.remove('active');
    }

    // Navigate to previous image
    function previousImage() {
      currentViewerIndex = (currentViewerIndex - 1 + generatedImages.length) % generatedImages.length;
      openViewer(currentViewerIndex);
    }

    // Navigate to next image
    function nextImage() {
      currentViewerIndex = (currentViewerIndex + 1) % generatedImages.length;
      openViewer(currentViewerIndex);
    }

    // Download current image
    function downloadCurrentImage() {
      const image = generatedImages[currentViewerIndex];
      downloadImage(image.url, image.type, image.seed);
    }

    // Share current image
    function shareCurrentImage() {
      const image = generatedImages[currentViewerIndex];
      shareImage(image.url);
    }

    // Download all images
    function downloadAll() {
      generatedImages.forEach((image, index) => {
        setTimeout(() => {
          downloadImage(image.url, image.type, image.seed);
        }, index * 500); // Stagger downloads
      });
      showSnackbar(`Downloading all ${generatedImages.length} images...`);
    }

    // Generate more images
    function generateMore() {
      goBack();
      showSnackbar("Ready to generate more images!");
    }

    // Go back to main page
    function goBack() {
      document.getElementById('resultsPage').classList.remove('active');
    }

    // Download image
    function downloadImage(url, type, seed) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-${type}-${seed}-${Date.now()}.png`;
      link.click();
    }

    // Share image (Web Share API if available)
    async function shareImage(url) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'AI Generated Image',
            text: 'Check out this AI generated image!',
            url: url
          });
        } catch (error) {
          copyToClipboard(url);
        }
      } else {
        copyToClipboard(url);
      }
    }

    // Copy URL to clipboard
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        showSnackbar("Image URL copied to clipboard!");
      }).catch(() => {
        showSnackbar("Couldn't copy URL");
      });
    }

    // Initialize app
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('promptInput').focus();
    });

    // Handle back button
    window.addEventListener('popstate', function() {
      if (document.getElementById('resultsPage').classList.contains('active')) {
        goBack();
      }
    });

    // Close viewer with escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('imageViewer').classList.contains('active')) {
        closeViewer();
      }
      if (e.key === 'ArrowLeft' && document.getElementById('imageViewer').classList.contains('active')) {
        previousImage();
      }
      if (e.key === 'ArrowRight' && document.getElementById('imageViewer').classList.contains('active')) {
        nextImage();
      }
    });

    // Close viewer when clicking outside image
    document.getElementById('imageViewer').addEventListener('click', function(e) {
      if (e.target === this) {
        closeViewer();
      }
    });

    // Add ripple effect to buttons
    document.querySelectorAll('.ripple').forEach(button => {
      button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple-effect');
        
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
      });
    });
